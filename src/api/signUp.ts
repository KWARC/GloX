import { signup } from "../serverFns/signUp.server";

export async function signupApi(email: string, password: string) {
  return signup({ data: { email, password } } as any);
}
