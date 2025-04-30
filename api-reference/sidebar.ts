// sidebar.ts
export default [
    {
      section: "API Reference",
      pages: [
        "/api-reference/introduction",
        "/api-reference/authentication",
        {
          label: "OpenAPI Reference",
          openapi: "api-reference/openapi.json"
        }
      ]
    },
    {
      section: "User Guides",
      pages: [
        "/user-guides/setup",
        "/user-guides/troubleshooting"
      ]
    }
  ]
  