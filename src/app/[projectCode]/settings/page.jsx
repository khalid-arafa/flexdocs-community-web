import Tabs from "@/components/Tabs";
import GeneralSettings from "./GeneralSettings";
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
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4">
      <Tabs tabs={tabs} />
    </div>
  );
}
