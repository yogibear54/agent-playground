import type { ComponentType } from "react";
import type { ChapterPageProps } from "./components/ChapterTemplate";

export type Chapter = {
  id: string;
  title: string;
  overview: [string, string?];
  filesCovered: string[];
  component: ComponentType<ChapterPageProps>;
};
