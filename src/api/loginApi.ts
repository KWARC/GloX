import { login } from "@/serverFns/login.server";

export async function loginApi(email: string, password: string) {
  return login({ data: { email, password } } as any);
}
