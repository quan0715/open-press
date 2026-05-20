import type { HTMLAttributes, ReactNode } from "react";

export type PageKind = "cover" | "toc" | "report" | "back-cover";

export interface PageProps {
  pageIndex: number;
  totalPages: number;
  chapterSlug?: string;
  chapterTone?: string;
  children: ReactNode;
}

export type BasePageProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  kind: PageKind;
  footer?: boolean;
  children?: ReactNode;
};

export type BaseShellPageProps = Omit<BasePageProps, "kind" | "footer">;

export type BaseReportPageProps = Omit<BasePageProps, "kind" | "footer" | "children"> &
  PageProps & {
    runningHeader?: ReactNode;
    footerLeft?: ReactNode;
    footerRight?: ReactNode;
  };

export type BaseFigureProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  caption?: ReactNode;
  children: ReactNode;
};

export type BaseCalloutKind = "info" | "warn" | "success" | "error" | (string & {});

export type BaseCalloutProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  kind?: BaseCalloutKind;
  children: ReactNode;
};

export interface QDocManifest {
  title: string;
  subtitle?: string;
  organization?: string;
  workspaceLabel?: string;
  documentDir?: string;
  sourceDir?: string;
  componentsDir?: string;
  mediaDir?: string;
  themeDir?: string;
  designDoc?: string;
  publicDir?: string;
  outputDir?: string;
  pdf?: {
    filename?: string;
  };
  deploy?: {
    adapter?: string;
    source?: string;
    projectName?: string;
    commitDirty?: boolean;
    requiresConfirmation?: boolean;
  };
  paths?: {
    chaptersDir?: string;
    sourceDir?: string;
    componentsDir?: string;
    mediaDir?: string;
    themeDir?: string;
    designDoc?: string;
  };
}
