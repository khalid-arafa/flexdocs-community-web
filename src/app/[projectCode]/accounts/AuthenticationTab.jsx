"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Loader,
  Lock,
  MoreVerticalIcon,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";

import Tabs from "@/components/Tabs";

import { useProjectsContext } from "@/context/ProjectsContext";
import { useDialogs } from "@/context/DialogsContext";
import LoadMorePagination from "@/components/LoadMorePagination";
import DropdownButton from "@/components/DropdownButton";
import AddEditAccount from "../../../components/AddEditAccount";
import { showDialog } from "@/components/CustomDialog";
import { formatDate } from "@/utils/datetime";
import SetPasswordModal from "../../../components/SetPasswordModal";
import { deleteAccount, updateAccountData } from "@/utils/api";
import { toast } from "react-toastify";
import { getSocket } from "@/utils/socket";
import { useProjectAuthContext } from "@/context/ProjectAuthContext";
import { mergeAdd, mergeUpdate, mergeDelete } from "@/utils/realtimeMerge";
import AuthRulesTab from "./AuthRulesTab";

// Realtime account events don't all carry the same identifier: add/update push
// the whole account (which has both `_id` and `uid`), while delete pushes only
// the Mongo query the API deleted with — `{ _id }`, no `uid`. The list is keyed
// by `uid`, so every event item is normalized to one before merging. Without
// this a delete matched `undefined` against every row, removed nothing, and the
// deleted account stayed on screen while the total silently dropped.
const withUid = (items) =>
  items.map((item) => ({
    ...item,
    uid: item.uid ?? (item._id != null ? String(item._id) : undefined),
  }));

// Initials fallback for accounts with no usable avatar URL. Deliberately local
// markup rather than a remote placeholder service: this is an operator console,
// so it must not emit a third-party request (and reveal who is being viewed)
// just to draw an empty circle.
const getInitials = (label) => {
  const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
};

const AccountAvatar = ({ user }) => {
  // `failed` also covers a URL that is well-formed but 404s/blocked, which the
  // remote placeholder used to mask.
  const [failed, setFailed] = useState(false);
  const src =
    user.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : null;

  if (!src || failed) {
    return (
      <div className="h-10 w-10 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold select-none">
        {getInitials(user.name || user.email)}
      </div>
    );
  }

  return (
    /* Avatars are arbitrary operator-supplied URLs, so next/image optimization
       can't allowlist their hosts — `unoptimized` lets any URL render (governed
       by CSP img-src) instead of throwing for every host not in
       images.remotePatterns. */
    <Image
      src={src}
      alt={`${user.name || user.email || "Account"} avatar`}
      width={40}
      height={40}
      unoptimized
      onError={() => setFailed(true)}
      className="h-10 w-10 rounded-full object-cover"
    />
  );
};

function AuthenticationTab() {
  const tabs = [
    { label: "Accounts", content: <Content /> },
    { label: "Rules", content: <AuthRulesTab /> },
  ];
  const { activeProject } = useProjectsContext();
  return (
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4">
      <Tabs
        tabs={tabs}
        trailing={
          <DropdownButton
            button={
              <div className="cursor-pointer hover:bg-white p-2 transition-all duration-300 ease-in-out rounded-md">
                <MoreVerticalIcon size={18} color="#000" />
              </div>
            }
            choices={[
              {
                icon: <Plus size={18} />,
                label: "Add Account",
                onClick: () => {
                  showDialog({
                    content: AddEditAccount,
                    params: { activeProject },
                  });
                },
              },
            ]}
          />
        }
      />
    </div>
  );
}

const Content = () => {
  const { activeProject } = useProjectsContext();

  const {
    accounts,
    setAccounts,
    accountsPage,
    setAccountsPage,
    loadAccounts,
    clearAccounts,
    loadingAccounts,
    loadingMoreAccounts,
    accountsTotalCount,
    setAccountsTotalCount,
  } = useProjectAuthContext();

  const { confirm } = useDialogs();

  //
  // get choices
  const choices = (account) => {
    const result = [
      {
        label: "Delete",
        icon: <X size={18} />,
        onClick: async () => {
          const confirmed = await confirm({
            msg: "Are you sure that you want to delete this account?",
          });
          if (!confirmed) return;
          try {
            const result = await deleteAccount({
              projectCode: activeProject.code,
              docId: account.uid,
            });

            if (result.ok) {
              // Drop the row optimistically, but leave accountsTotalCount to the
              // socket handler. The server echoes this delete back to the client
              // that issued it, so decrementing here as well took the total down
              // by two for every account the operator deleted themselves.
              setAccounts((prev) => prev.filter((a) => a.uid !== account.uid));
              return toast("Account has been deleted successfully.");
            }
            const body = await result.json();
            return toast(body.message);
          } catch {
            toast("Failed to delete account");
          }
        },
      },
    ];
    if (account.isActive) {
      result.unshift({
        label: "Deactivate",
        icon: <Pause size={18} color="#000" />,
        onClick: async () => {
          const result = await updateAccountData({
            projectCode: activeProject.code,
            docId: account.uid,
            data: { isActive: false },
          });
          const body = await result.json();
          if (result.ok) {
            setAccounts((prev) =>
              prev.map((a) =>
                a.uid === account.uid ? { ...a, isActive: false } : a
              )
            );
            return;
          }
          return toast(body.message);
        },
      });
    } else {
      result.unshift({
        label: "Activate",
        icon: <Play size={18} color="#000" />,
        onClick: async () => {
          const result = await updateAccountData({
            projectCode: activeProject.code,
            docId: account.uid,
            data: { isActive: true },
          });
          const body = await result.json();
          if (result.ok) {
            setAccounts((prev) =>
              prev.map((a) =>
                a.uid === account.uid ? { ...a, isActive: true } : a
              )
            );
            return;
          }
          return toast(body.message);
        },
      });
    }
    result.unshift({
      label: "Set Password",
      icon: <Lock size={18} color="#000" />,
      onClick: async () => {
        showDialog({
          content: SetPasswordModal,
          params: { activeProject, accountId: account.uid, toast },
        });
      },
    });
    return result;
  };

  useEffect(() => {
    if (!activeProject) return;
    const room = `${activeProject.code}/_auth`;
    
    const handleData = async (data) => {
      if (data.add) {
        const added = withUid(data.add);
        setAccounts((prev) => mergeAdd(prev, added, "uid"));
        // The total gates "Load More", and adds never touched it: a list grown
        // by realtime inserts eventually held more rows than the total claimed
        // existed, so the button vanished while pages were still unloaded.
        // Functional update for the same reason as delete below.
        setAccountsTotalCount((prev) => prev + added.length);
      }

      // Edits made by any other client (or by this project's own SDK) never
      // reached the list at all — there was no `update` branch — so the tab kept
      // showing stale names/emails until a full reload. Merging leaves the total
      // alone: an update changes a row, it doesn't change how many rows exist.
      if (data.update) {
        setAccounts((prev) => mergeUpdate(prev, withUid(data.update), "uid"));
      }

      if (data.delete) {
        const deleted = withUid(data.delete);
        setAccounts((prev) => mergeDelete(prev, deleted, "uid"));
        // Functional update: this handler is bound once per effect, so reading
        // accountsTotalCount from the closure drifted after any earlier event.
        setAccountsTotalCount((prev) => prev - deleted.length);
      }
    };
    // Guard a null socket (project without a token) — .on() on null would crash
    // the accounts tab, same as the database panels did.
    const socket = getSocket(activeProject.projectToken);
    if (!socket) return;
    socket.on(room, handleData);
    socket.emit("watch-accounts", {});
    return () => socket.off(room, handleData);
  }, [activeProject]);

  useEffect(() => {    
    if (accountsPage == 1) return;
    loadAccounts({ page: accountsPage, projectCode: activeProject.code });
  }, [accountsPage]);

  useEffect(() => {
    if (!activeProject) return;    
    clearAccounts();
    loadAccounts({ page: 1, projectCode: activeProject.code });
  }, [activeProject]);

  return (
    <div className="mx-auto max-w-6xl rounded-lg">
      {loadingAccounts && (
        <div className="flex items-center justify-center h-150">
          <Loader className="w-6 h-6 animate-spin text-gray-800" />
        </div>
      )}
      {!loadingAccounts && accounts.length == 0 && (
        <div className="flex center text-sm text-gray-400">
          No account were found!
        </div>
      )}
      {!loadingAccounts && accounts.length > 0 && (
        <div className="">
          {/* Header row - desktop only */}
          <div className="hidden md:flex bg-gray-100 text-gray-400 text-left text-sm font-normal px-4 py-2 items-center gap-4">
            <div className="flex-1 min-w-0">Name</div>
            <div className="flex-1 min-w-0">Email</div>
            <div className="hidden lg:block flex-1 min-w-0">UID</div>
            <div className="hidden lg:block flex-1 min-w-0">Created At</div>
            <div className="shrink-0 w-10.5 text-center">Options</div>
          </div>

          {/* Cards */}
          {accounts.map((user) => (
            <div
              key={user.uid}
              className="bg-white border-b border-gray-200 hover:bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Name */}
                <div className="flex flex-row gap-4 font-bold items-center min-w-0 flex-1">
                  <div
                    className={`h-10 w-10 relative rounded-full shrink-0 ${
                      user.isActive ? "" : "border-3 border-red-500"
                    }`}
                  >
                    <AccountAvatar user={user} />
                  </div>
                  <span className="text-gray-700 truncate">{user.name || "-No Name-"}</span>
                </div>

                {/* Email - hidden on small screens */}
                <div className="hidden md:block text-brand flex-1 min-w-0 truncate">
                  {user.email}
                </div>

                {/* UID - hidden on small screens */}
                <div className="hidden lg:block text-gray-700 flex-1 min-w-0 truncate">
                  {user.uid}
                </div>

                {/* Created At - hidden on small screens */}
                <div className="hidden lg:block text-gray-700 flex-1 min-w-0">
                  {formatDate(user.createdAt)}
                </div>

                {/* Options */}
                <div className="flex items-center justify-center shrink-0">
                  <DropdownButton
                    button={
                      <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                        <MoreVerticalIcon size={18} color="black" />
                      </div>
                    }
                    choices={choices(user)}
                  />
                </div>
              </div>

              {/* Mobile-only details */}
              <div className="md:hidden mt-3 space-y-2 text-sm pl-14">
                <div className="text-blue-600">{user.email}</div>
                <div className="text-gray-700">UID: {user.uid}</div>
                <div className="text-gray-700">{formatDate(user.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loadingMoreAccounts && accounts.length > 0 && (
        <LoadMorePagination
          loadMore={() => setAccountsPage(accountsPage + 1)}
          canLoadMore={accountsTotalCount > accounts.length}
          showing={accounts.length}
          totalCount={accountsTotalCount}
        />
      )}
    </div>
  );
};

export default AuthenticationTab;
