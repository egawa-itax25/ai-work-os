import PortfolioView from "./portfolio-view";
import { portfolioFilters, type PortfolioFilter } from "@/lib/portfolio-data";

export const metadata = {
  title: "ポートフォリオ",
  description: "複数プロジェクトの進捗、優先順位、現在のボールを俯瞰します。",
};

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = portfolioFilters.some((item) => item.id === params?.filter)
    ? (params?.filter as PortfolioFilter)
    : "all";

  return <PortfolioView initialFilter={filter} />;
}
