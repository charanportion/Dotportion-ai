import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-950">Create account</h1>
          <p className="text-sm text-zinc-500 mt-1">Product Intelligence AI</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border border-zinc-200 rounded-lg",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton:
                "border border-zinc-200 text-zinc-700 hover:bg-zinc-50",
              formButtonPrimary: "bg-zinc-950 hover:bg-zinc-800",
              footerActionLink: "text-zinc-950 hover:text-zinc-700",
            },
          }}
        />
      </div>
    </div>
  );
}
