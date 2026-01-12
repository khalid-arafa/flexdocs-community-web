import React from "react";
import AuthenticationTab from "@/app/[projectCode]/accounts/AuthenticationTab";

function page() {
  return <AuthenticationTab forAdmin={false} />;
}

export default page;
