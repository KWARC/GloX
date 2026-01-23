export function loginUsingRedirect(returnBackUrl?: string) {
  if (typeof window === "undefined") return;

  if (!returnBackUrl) {
    returnBackUrl = window.location.href;
  }

  const encodedTarget = encodeURIComponent(returnBackUrl);

  // Get auth server URL from env
  const authServer =
    import.meta.env.VITE_AUTH_SERVER_URL ||
    import.meta.env.NEXT_PUBLIC_AUTH_SERVER_URL;

  if (!authServer) {
    console.error("AUTH_SERVER_URL not configured");
    return;
  }

  // Check for cross-domain auth requirement
  const currentHost = window.location.hostname;
  const nonFauDomain = import.meta.env.VITE_NON_FAU_DOMAIN || 
                       import.meta.env.NEXT_PUBLIC_NON_FAU_DOMAIN;
  const fauDomain = import.meta.env.VITE_FAU_DOMAIN || 
                    import.meta.env.NEXT_PUBLIC_FAU_DOMAIN;

  // If on non-FAU domain, redirect to FAU domain for cross-domain auth
  if (nonFauDomain && currentHost === nonFauDomain && fauDomain) {
    window.location.replace(
      `https://${fauDomain}/cross-domain-auth/init?target=${encodedTarget}`
    );
    return;
  }

  // Standard FAU IdM login redirect
  window.location.replace(`${authServer}/login?target=${encodedTarget}`);
}