/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from "./routes/__root";
import { Route as IndexImport } from "./routes/index";
import { Route as SettingsIndexImport } from "./routes/settings/index";
import { Route as PostsIndexImport } from "./routes/posts/index";
import { Route as CompsIndexImport } from "./routes/comps/index";
import { Route as AboutIndexImport } from "./routes/about/index";
import { Route as PostsPostIdImport } from "./routes/posts/$postId";
import { Route as SettingsBaseIndexImport } from "./routes/settings/base/index";

// Create/Update Routes

const IndexRoute = IndexImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);

const SettingsIndexRoute = SettingsIndexImport.update({
  id: "/settings/",
  path: "/settings/",
  getParentRoute: () => rootRoute,
} as any);

const PostsIndexRoute = PostsIndexImport.update({
  id: "/posts/",
  path: "/posts/",
  getParentRoute: () => rootRoute,
} as any);

const CompsIndexRoute = CompsIndexImport.update({
  id: "/comps/",
  path: "/comps/",
  getParentRoute: () => rootRoute,
} as any);

const AboutIndexRoute = AboutIndexImport.update({
  id: "/about/",
  path: "/about/",
  getParentRoute: () => rootRoute,
} as any);

const PostsPostIdRoute = PostsPostIdImport.update({
  id: "/posts/$postId",
  path: "/posts/$postId",
  getParentRoute: () => rootRoute,
} as any);

const SettingsBaseIndexRoute = SettingsBaseIndexImport.update({
  id: "/settings/base/",
  path: "/settings/base/",
  getParentRoute: () => rootRoute,
} as any);

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexImport;
      parentRoute: typeof rootRoute;
    };
    "/posts/$postId": {
      id: "/posts/$postId";
      path: "/posts/$postId";
      fullPath: "/posts/$postId";
      preLoaderRoute: typeof PostsPostIdImport;
      parentRoute: typeof rootRoute;
    };
    "/about/": {
      id: "/about/";
      path: "/about";
      fullPath: "/about";
      preLoaderRoute: typeof AboutIndexImport;
      parentRoute: typeof rootRoute;
    };
    "/comps/": {
      id: "/comps/";
      path: "/comps";
      fullPath: "/comps";
      preLoaderRoute: typeof CompsIndexImport;
      parentRoute: typeof rootRoute;
    };
    "/posts/": {
      id: "/posts/";
      path: "/posts";
      fullPath: "/posts";
      preLoaderRoute: typeof PostsIndexImport;
      parentRoute: typeof rootRoute;
    };
    "/settings/": {
      id: "/settings/";
      path: "/settings";
      fullPath: "/settings";
      preLoaderRoute: typeof SettingsIndexImport;
      parentRoute: typeof rootRoute;
    };
    "/settings/base/": {
      id: "/settings/base/";
      path: "/settings/base";
      fullPath: "/settings/base";
      preLoaderRoute: typeof SettingsBaseIndexImport;
      parentRoute: typeof rootRoute;
    };
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute;
  "/posts/$postId": typeof PostsPostIdRoute;
  "/about": typeof AboutIndexRoute;
  "/comps": typeof CompsIndexRoute;
  "/posts": typeof PostsIndexRoute;
  "/settings": typeof SettingsIndexRoute;
  "/settings/base": typeof SettingsBaseIndexRoute;
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute;
  "/posts/$postId": typeof PostsPostIdRoute;
  "/about": typeof AboutIndexRoute;
  "/comps": typeof CompsIndexRoute;
  "/posts": typeof PostsIndexRoute;
  "/settings": typeof SettingsIndexRoute;
  "/settings/base": typeof SettingsBaseIndexRoute;
}

export interface FileRoutesById {
  __root__: typeof rootRoute;
  "/": typeof IndexRoute;
  "/posts/$postId": typeof PostsPostIdRoute;
  "/about/": typeof AboutIndexRoute;
  "/comps/": typeof CompsIndexRoute;
  "/posts/": typeof PostsIndexRoute;
  "/settings/": typeof SettingsIndexRoute;
  "/settings/base/": typeof SettingsBaseIndexRoute;
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths:
    | "/"
    | "/posts/$postId"
    | "/about"
    | "/comps"
    | "/posts"
    | "/settings"
    | "/settings/base";
  fileRoutesByTo: FileRoutesByTo;
  to:
    | "/"
    | "/posts/$postId"
    | "/about"
    | "/comps"
    | "/posts"
    | "/settings"
    | "/settings/base";
  id:
    | "__root__"
    | "/"
    | "/posts/$postId"
    | "/about/"
    | "/comps/"
    | "/posts/"
    | "/settings/"
    | "/settings/base/";
  fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute;
  PostsPostIdRoute: typeof PostsPostIdRoute;
  AboutIndexRoute: typeof AboutIndexRoute;
  CompsIndexRoute: typeof CompsIndexRoute;
  PostsIndexRoute: typeof PostsIndexRoute;
  SettingsIndexRoute: typeof SettingsIndexRoute;
  SettingsBaseIndexRoute: typeof SettingsBaseIndexRoute;
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  PostsPostIdRoute: PostsPostIdRoute,
  AboutIndexRoute: AboutIndexRoute,
  CompsIndexRoute: CompsIndexRoute,
  PostsIndexRoute: PostsIndexRoute,
  SettingsIndexRoute: SettingsIndexRoute,
  SettingsBaseIndexRoute: SettingsBaseIndexRoute,
};

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>();

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/posts/$postId",
        "/about/",
        "/comps/",
        "/posts/",
        "/settings/",
        "/settings/base/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/posts/$postId": {
      "filePath": "posts/$postId.tsx"
    },
    "/about/": {
      "filePath": "about/index.tsx"
    },
    "/comps/": {
      "filePath": "comps/index.tsx"
    },
    "/posts/": {
      "filePath": "posts/index.tsx"
    },
    "/settings/": {
      "filePath": "settings/index.tsx"
    },
    "/settings/base/": {
      "filePath": "settings/base/index.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
