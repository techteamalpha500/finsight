import { redirect } from "next/navigation";

export default function PortfolioIndexRedirect() {
  redirect("/PortfolioManagement/Portfolio/Holdings");
  return null;
}
