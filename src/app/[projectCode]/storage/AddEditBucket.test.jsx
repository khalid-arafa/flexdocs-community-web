// @vitest-environment jsdom
//
// Per-field validation (blur first, live clear, submit as the final gate that
// focuses the first offender) plus the two silent failures: the dialog used to
// close even when the API rejected the create, and it dropped the description.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

const createStorageBucket = vi.fn();
const updateStorageBucket = vi.fn();
vi.mock("@/utils/api", () => ({
  createStorageBucket: (...args) => createStorageBucket(...args),
  updateStorageBucket: (...args) => updateStorageBucket(...args),
}));
vi.mock("react-toastify", () => ({ toast: vi.fn() }));

import AddEditBucket from "./AddEditBucket";

const activeProject = { code: "proj" };
const nameInput = () => screen.getByPlaceholderText("Enter bucket name");
const descInput = () =>
  screen.getByPlaceholderText("Enter bucket description (optional)");
const submit = () => screen.getByRole("button", { name: "Submit" });

const ok = (body = {}) => ({ ok: true, json: async () => body });
const failed = (message) => ({ ok: false, json: async () => ({ message }) });

beforeEach(() => {
  vi.clearAllMocks();
});

// vitest runs without `globals`, so testing-library's auto-cleanup never
// registers itself; unmount explicitly or the renders pile up in the document.
afterEach(cleanup);

describe("AddEditBucket validation", () => {
  it("reports a missing name on blur, before any submit", () => {
    render(<AddEditBucket activeProject={activeProject} onDone={vi.fn()} />);

    fireEvent.blur(nameInput());
    expect(screen.getByText("Bucket name is required!")).toBeTruthy();
    expect(createStorageBucket).not.toHaveBeenCalled();
  });

  it("treats whitespace as empty", () => {
    render(<AddEditBucket activeProject={activeProject} onDone={vi.fn()} />);

    fireEvent.change(nameInput(), { target: { value: "   " } });
    fireEvent.blur(nameInput());
    expect(screen.getByText("Bucket name is required!")).toBeTruthy();
  });

  it("clears a shown error live, without waiting for another blur", () => {
    render(<AddEditBucket activeProject={activeProject} onDone={vi.fn()} />);

    fireEvent.blur(nameInput());
    expect(screen.getByText("Bucket name is required!")).toBeTruthy();

    fireEvent.change(nameInput(), { target: { value: "photos" } });
    expect(screen.queryByText("Bucket name is required!")).toBeNull();
  });

  it("blocks submit and focuses the first offending field", async () => {
    const onDone = vi.fn();
    render(<AddEditBucket activeProject={activeProject} onDone={onDone} />);

    fireEvent.click(submit());

    await waitFor(() =>
      expect(screen.getByText("Bucket name is required!")).toBeTruthy()
    );
    expect(document.activeElement).toBe(nameInput());
    expect(createStorageBucket).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("only checks the optional description once it is filled", () => {
    render(<AddEditBucket activeProject={activeProject} onDone={vi.fn()} />);

    fireEvent.blur(descInput());
    expect(screen.queryByText(/Description must be/)).toBeNull();

    fireEvent.change(descInput(), { target: { value: "x".repeat(501) } });
    fireEvent.blur(descInput());
    expect(screen.getByText(/Description must be/)).toBeTruthy();
  });
});

describe("AddEditBucket submit", () => {
  it("sends the trimmed name AND the description when creating", async () => {
    createStorageBucket.mockResolvedValue(ok({ _id: "b1" }));
    const onDone = vi.fn();
    render(
      <AddEditBucket
        activeProject={activeProject}
        parentId="root"
        onDone={onDone}
      />
    );

    fireEvent.change(nameInput(), { target: { value: "  photos  " } });
    fireEvent.change(descInput(), { target: { value: "holiday shots" } });
    fireEvent.click(submit());

    await waitFor(() => expect(createStorageBucket).toHaveBeenCalledTimes(1));
    expect(createStorageBucket).toHaveBeenCalledWith({
      projectCode: "proj",
      name: "photos",
      description: "holiday shots",
      parentId: "root",
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("stays open and shows the error when the API rejects the create", async () => {
    createStorageBucket.mockResolvedValue(failed("Bucket already exists"));
    const onDone = vi.fn();
    render(<AddEditBucket activeProject={activeProject} onDone={onDone} />);

    fireEvent.change(nameInput(), { target: { value: "photos" } });
    fireEvent.click(submit());

    await waitFor(() =>
      expect(screen.getByText("Bucket already exists")).toBeTruthy()
    );
    expect(onDone).not.toHaveBeenCalled();
  });

  it("stays open when the request throws", async () => {
    createStorageBucket.mockRejectedValue(new Error("offline"));
    const onDone = vi.fn();
    render(<AddEditBucket activeProject={activeProject} onDone={onDone} />);

    fireEvent.change(nameInput(), { target: { value: "photos" } });
    fireEvent.click(submit());

    await waitFor(() => expect(createStorageBucket).toHaveBeenCalled());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("updates an existing bucket with both fields", async () => {
    updateStorageBucket.mockResolvedValue(ok({}));
    const onDone = vi.fn();
    render(
      <AddEditBucket
        title="Editing Bucket"
        bucket={{ _id: "b1", name: "photos", description: "old" }}
        activeProject={activeProject}
        onDone={onDone}
      />
    );

    expect(nameInput().value).toBe("photos");
    fireEvent.change(descInput(), { target: { value: "new" } });
    fireEvent.click(submit());

    await waitFor(() =>
      expect(updateStorageBucket).toHaveBeenCalledWith({
        projectCode: "proj",
        bucketId: "b1",
        data: { name: "photos", description: "new" },
      })
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
