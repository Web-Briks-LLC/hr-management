import { redirect } from "next/navigation";

export default function SignupPage() {
    redirect("/sign-in");
    return null;
}
