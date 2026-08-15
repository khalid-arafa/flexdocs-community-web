// @vitest-environment jsdom
//
// Regressions for the storage listing: the null-socket crash, the fetch races
// around a bucket switch, index-keyed rows losing their identity to realtime
// prepends, and the project token that used to ride along in every file URL.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  act,
  waitFor,
  cleanup,
} from "@testing-library/react";

const socketHandlers = {};
let fakeSocket;
vi.mock("@/utils/socket", () => ({ getSocket: () => fakeSocket }));

vi.mock("react-toastify", () => ({ toast: vi.fn() }));
vi.mock("@/components/CustomDialog", () => ({ showDialog: vi.fn() }));
vi.mock("@/utils/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("@/context/DialogsContext", () => ({
  useDialogs: () => ({ confirm: vi.fn() }),
}));

let activeProject = { code: "proj", projectToken: "SECRET-PROJECT-TOKEN" };
vi.mock("@/context/ProjectsContext", () => ({
  useProjectsContext: () => ({ activeProject }),
}));

// A hand-driven stand-in for StorageContext, so a test can move the browsing
// path exactly the way the provider would.
let storageValue;
vi.mock("@/context/StorageContext", () => ({
  useStorageContext: () => storageValue,
}));

vi.mock("@/utils/api", () => ({
  getBucketContent: vi.fn(),
  getSignedDownloadUrl: vi.fn(),
  deleteStorageBucket: vi.fn(),
  deleteStorageFile: vi.fn(),
}));

import { getBucketContent, getSignedDownloadUrl } from "@/utils/api";
import { useState } from "react";
import StorageTabContent from "./StorageTabContent";

function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

const okContent = (content, totalCount = content.length) => ({
  ok: true,
  status: 200,
  json: async () => ({ content, totalCount }),
});

const file = (id, name, extra = {}) => ({
  _id: id,
  name,
  ext: "jpg",
  type: "file",
  projectCode: "proj",
  isPublic: true,
  size: 10,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

// A harness that owns the browsing path in real React state and republishes it
// through the mocked context on every render — the same sequence the real
// provider produces, so effects re-run exactly as they would in the app.
let navigate;
function Harness() {
  const [pathList, setPathList] = useState([]);
  navigate = setPathList;
  storageValue = {
    bucketPathList: pathList,
    setBucketPathList: setPathList,
    getCurrentBucket: () =>
      pathList.length ? pathList[pathList.length - 1] : null,
  };
  return <StorageTabContent />;
}

const renderScreen = async () => {
  await act(async () => {
    render(<Harness />);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
  fakeSocket = {
    on: vi.fn((room, handler) => {
      socketHandlers[room] = handler;
    }),
    off: vi.fn(),
    emit: vi.fn(),
  };
  activeProject = { code: "proj", projectToken: "SECRET-PROJECT-TOKEN" };
  navigate = null;
  getSignedDownloadUrl.mockResolvedValue({
    ok: true,
    json: async () => ({
      url: "projects/proj/storage/f1/pic.jpg?size=small&expires=99999999999&signature=sig",
      expires: 99999999999,
    }),
  });
});

// The vitest config does not enable globals, so RTL's automatic cleanup is
// not installed — unmount by hand or every render piles up in the document.
afterEach(() => {
  cleanup();
});

describe("StorageTabContent socket wiring", () => {
  it("does not crash when the project has no token (getSocket returns null)", async () => {
    fakeSocket = null;
    activeProject = { code: "proj" }; // no projectToken
    getBucketContent.mockResolvedValue(okContent([]));

    await renderScreen();

    // The screen still rendered its listing instead of throwing.
    expect(await screen.findByText("This folder is empty")).toBeTruthy();
  });
});

describe("StorageTabContent fetching", () => {
  it("fetches once per bucket view, with no artificial delay", async () => {
    getBucketContent.mockResolvedValue(okContent([file("f1", "pic")]));

    await renderScreen();

    await waitFor(() => expect(getBucketContent).toHaveBeenCalledTimes(1));
    expect(getBucketContent).toHaveBeenCalledWith(
      expect.objectContaining({ bucketId: "home", page: 1 })
    );
    // No 400ms sleep: the row is on screen without advancing any timer.
    expect(await screen.findByRole("button", { name: "pic.jpg" })).toBeTruthy();
  });

  it("never requests page N of a newly entered bucket (page resets in the same batch)", async () => {
    // Page 1, then Load More -> page 2 of "home".
    getBucketContent.mockResolvedValue(
      okContent([{ _id: "b1", name: "docs", type: "bucket" }], 40)
    );
    await renderScreen();
    await waitFor(() => expect(getBucketContent).toHaveBeenCalledTimes(1));

    await act(async () => {
      screen.getByRole("button", { name: /Load More/i }).click();
    });
    await waitFor(() => expect(getBucketContent).toHaveBeenCalledTimes(2));
    expect(getBucketContent.mock.calls[1][0].page).toBe(2);

    // Now enter the bucket. Every subsequent call must be page 1 of "b1" —
    // the old behaviour fetched page 2 of "b1" first and merged its rows.
    getBucketContent.mockResolvedValue(okContent([file("f9", "inside")]));
    await act(async () => {
      screen.getByRole("button", { name: "docs" }).click();
    });

    await waitFor(() => expect(getBucketContent).toHaveBeenCalledTimes(3));
    const afterEnter = getBucketContent.mock.calls.slice(2).map((c) => c[0]);
    expect(afterEnter).toEqual([
      expect.objectContaining({ bucketId: "b1", page: 1 }),
    ]);
  });

  it("drops a superseded response instead of merging its rows", async () => {
    const slow = deferred();
    getBucketContent.mockReturnValueOnce(slow.promise);

    await renderScreen();

    // While the home listing is still in flight, navigate into a bucket.
    getBucketContent.mockResolvedValue(okContent([file("new", "fresh")]));
    await act(async () => {
      navigate([{ _id: "b1", name: "docs" }]);
    });
    await waitFor(() =>
      expect(screen.queryAllByText("fresh.jpg").length).toBeGreaterThan(0)
    );

    // The first (now stale) request finally answers.
    await act(async () => {
      slow.resolve(okContent([file("stale", "stale")]));
      await slow.promise;
    });

    expect(screen.queryAllByText("stale.jpg")).toHaveLength(0);
    expect(screen.queryAllByText("fresh.jpg").length).toBeGreaterThan(0);
  });
});

describe("StorageTabContent row identity", () => {
  it("keeps a row's DOM node when a realtime event PREPENDS another file", async () => {
    getBucketContent.mockResolvedValue(okContent([file("f2", "second")]));
    await renderScreen();
    const row = (name) =>
      screen.getByRole("button", { name }).closest(".border-b");
    const secondRow = row("second.jpg");
    expect(secondRow).toBeTruthy();

    await act(async () => {
      await socketHandlers["proj-storage"]({
        add: [file("f1", "first", { bucketId: null })],
      });
    });

    // Index keys handed this node's contents to the newcomer; id keys don't.
    expect(row("second.jpg")).toBe(secondRow);
    expect(row("first.jpg")).not.toBe(secondRow);
  });
});

describe("StorageTabContent file URLs", () => {
  it("never puts the project token in a rendered URL", async () => {
    getBucketContent.mockResolvedValue(okContent([file("f1", "pic")]));
    await renderScreen();

    // alt="" makes the thumbnail presentational, so query the tag directly.
    const img = document.querySelector("img");
    expect(img.getAttribute("src")).toContain("size=small");
    expect(img.getAttribute("src")).not.toContain("token");
    expect(document.body.innerHTML).not.toContain("SECRET-PROJECT-TOKEN");
  });

  it("shows a PRIVATE image through a minted signed URL", async () => {
    getBucketContent.mockResolvedValue(
      okContent([file("f1", "pic", { isPublic: false })])
    );
    await renderScreen();

    await waitFor(() => expect(getSignedDownloadUrl).toHaveBeenCalled());
    expect(getSignedDownloadUrl).toHaveBeenCalledWith({
      projectCode: "proj",
      fileId: "f1",
      size: "small",
    });

    const img = await waitFor(() => {
      const el = document.querySelector("img");
      expect(el).toBeTruthy();
      return el;
    });
    expect(img.getAttribute("src")).toContain("signature=sig");
    expect(img.getAttribute("src")).not.toContain("token");
  });

  it("mints each private thumbnail once, however often the list re-renders", async () => {
    getBucketContent.mockResolvedValue(
      okContent([
        file("f1", "pic", { isPublic: false }),
        file("f2", "pic2", { isPublic: false }),
      ])
    );
    await renderScreen();

    await waitFor(() => expect(getSignedDownloadUrl).toHaveBeenCalledTimes(2));

    await act(async () => {
      await socketHandlers["proj-storage"]({
        update: [{ _id: "f1", name: "pic-renamed" }],
      });
    });

    expect(getSignedDownloadUrl).toHaveBeenCalledTimes(2);
  });
});
