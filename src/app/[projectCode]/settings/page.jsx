import Tabs from "@/components/Tabs";
import GeneralSettings from "./GeneralSettings";
import { ToastContainer } from "react-toastify";
import ProjectCredentials from "./ProjectCredentials";


export default function SettingsTab() {
  const tabs = [
    {
      label: "General",
      content: <GeneralSettings />,
    },
    {
      label: "Credentials",
      content: <ProjectCredentials />,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Tabs tabs={tabs} />
      <ToastContainer />
    </div>
  );
}
