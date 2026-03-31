import { architectureOverviewChapter } from './architecture';
import { modulesChapter } from './modules';
import { dataFlowChapter } from './data-flow';
import { typeScriptPatternsChapter } from './typescript-patterns';
import { entryConfigChapter } from './entry-config';
import type { ChapterData } from './types';

export const chapters: ChapterData[] = [
  architectureOverviewChapter,
  modulesChapter,
  dataFlowChapter,
  typeScriptPatternsChapter,
  entryConfigChapter,
];
