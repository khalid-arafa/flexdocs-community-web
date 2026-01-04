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
import AddEditAccount from "./AddEditAccount";
import { showDialog } from "@/components/CustomDialog";
import { formatDate } from "@/utils/datetime";
import SetPasswordModal from "./SetPasswordModal";
import {
  deleteAccount,
  deletSystemUserById,
  updateAccountData,
} from "@/utils/api";
import { toast } from "react-toastify";
import { getSocket } from "@/utils/socket";
import { useProjectAuthContext } from "@/context/ProjectAuthContext";
import { useRouter } from "next/navigation";

function AuthenticationTab({ forAdmin = false }) {
  const tabs = [
    { label: "Accounts", content: <Content forAdmin={forAdmin} /> },
  ];
  const { activeProject } = useProjectsContext();
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
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

            if (result.ok)
              return toast("Account has been deleted successfully.");
            const body = await result.json();
            return toast(body.message);
          } catch (error) {
            console.log(error);
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
          if (result.ok) return;
          const body = await result.json();
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

          if (result.ok) return;
          const body = await result.json();
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
      if (data.add)
        setAccounts((prev) =>
          Array.from(
            new Map(
              [...data.add, ...prev]  // New items first
                .map(doc => [doc.uid, doc]),
            ).values()
          )
        );

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
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-400 text-left">
                <th className="py-3 px-4 font-normal text-sm">Name</th>
                <th className="py-3 px-4 font-normal text-sm">Email</th>
                <th className="py-3 px-4 font-normal text-sm">UID</th>
                <th className="py-3 px-4 font-normal text-sm">Created At</th>
                <th className="py-3 px-4 font-normal text-sm">Options</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {accounts.map((user, index) => (
                <tr
                  key={user.uid}
                  className={`border-b border-gray-200 hover:bg-gray-50`}
                >
                  <td className="py-3 px-4 text-gray-700">
                    <div className="flex flex-row gap-4 font-bold items-center">
                      <div
                        className={`h-10 w-10 relative rounded-full ${
                          user.isActive ? "" : " border-3  border-red-500"
                        }`}
                      >
                        <Image
                          src={user.avatar || "https://picsum.photos/80"}
                          alt={`${user.name}'s avatar`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      </div>
                      {user.name || "-No Name-"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-blue-600">{user.email}</td>
                  <td className="py-3 px-4 text-gray-700">{user.uid}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 px-4 flex items-center justify-center">
                    <DropdownButton
                      button={
                        <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                          <MoreVerticalIcon size={18} color="black" />
                        </div>
                      }
                      choices={choices(user)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
