"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import {
  Briefcase,
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
import {
  deleteAccount,
  deletSystemUserById,
  updateAccountData,
} from "@/utils/api";
import { toast } from "react-toastify";
import { getSocket } from "@/utils/socket";
import { useProjectAuthContext } from "@/context/ProjectAuthContext";
import { useRouter } from "next/navigation";
import AuthRulesTab from "./AuthRulesTab";

function AuthenticationTab({ forAdmin = false }) {
  const tabs = [
    { label: "Accounts", content: <Content forAdmin={forAdmin} /> },
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

const Content = ({ forAdmin = false }) => {
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

  const router = useRouter();

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
            const result = forAdmin
              ? await deletSystemUserById(account.uid)
              : await deleteAccount({
                  projectCode: activeProject.code,
                  docId: account.uid,
                });

            if (result.ok) {
              setAccounts((prev) => prev.filter((a) => a.uid !== account.uid));
              setAccountsTotalCount((prev) => prev - 1);
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
    if (forAdmin)
      result.unshift({
        label: "Projects",
        icon: <Briefcase size={18} color="#000" />,
        onClick: async () => {
          router.push(`/admin/?userId=${account.uid}`);
        },
      });
    return result;
  };

  useEffect(() => {
    if (!activeProject) return;
    const room = `${activeProject.code}/_auth`;
    
    const handleData = async (data) => { 
      if (data.add) {        
        setAccounts((prev) => {
          const updated = Array.from(
            new Map(
              [...prev, ...data.add]  // New items last, so they overwrite existing
                .map(doc => [doc.uid, doc])
            ).values()
          );
          return updated;
        });
      }

      if (data.delete) {
        setAccounts((prev) =>
          prev.filter((i) => !data.delete.map((x) => x.uid).includes(i.uid))
        );
        setAccountsTotalCount(accountsTotalCount - data.delete.length);
      }
    };
    getSocket(activeProject.projectToken).on(room, handleData);
    getSocket(activeProject.projectToken).emit("watch-accounts", {});
    return () => getSocket(activeProject.projectToken).off(room, handleData);
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
            <div className="flex-shrink-0 w-[42px] text-center">Options</div>
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
                    className={`h-10 w-10 relative rounded-full flex-shrink-0 ${
                      user.isActive ? "" : "border-3 border-red-500"
                    }`}
                  >
                    <Image
                      src={user.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : "https://picsum.photos/80"}
                      alt={`${user.name}'s avatar`}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
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
                <div className="flex items-center justify-center flex-shrink-0">
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
