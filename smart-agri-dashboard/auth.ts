import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "soil-agri-local-development-secret" : undefined),
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
      issuer: tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined,
    }),
  ],
  callbacks: {
    authorized: ({ auth }) => Boolean(auth?.user),
  },
});
