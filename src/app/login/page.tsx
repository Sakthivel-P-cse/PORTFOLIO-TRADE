"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (activeTab === "signup" && password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (activeTab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Successfully logged in!");
          router.push("/");
          router.refresh();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name || null,
            },
          },
        });

        if (error) {
          toast.error(error.message);
        } else {
          const session = data?.session;
          if (session) {
            toast.success("Account created and logged in!");
            router.push("/");
            router.refresh();
          } else {
            toast.success(
              "Account created! Please check your email to confirm registration."
            );
            setActiveTab("signin");
          }
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-black px-4">
      {/* Ambient gold glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#F5B82E]/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        <Card className="rounded-2xl border-white/10 bg-[#111] shadow-2xl">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#F5B82E]/15 ring-1 ring-[#F5B82E]/30">
              <TrendingUp className="size-7 text-[#F5B82E]" />
            </div>

            <div className="text-center">
              <h1 className="text-xl font-semibold text-white">
                Portfolio Tracker
              </h1>
              <p className="mt-1 text-sm text-white/50">
                Track deposits, P&amp;L, and your trading journal.
              </p>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex w-full rounded-xl bg-white/5 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("signin")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "signin"
                    ? "bg-[#F5B82E] text-black shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "signup"
                    ? "bg-[#F5B82E] text-black shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {activeTab === "signup" && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1.5 overflow-hidden"
                  >
                    <Label htmlFor="name" className="text-xs text-white/70">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#F5B82E] focus-visible:ring-[#F5B82E]/20"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs text-white/70">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#F5B82E] focus-visible:ring-[#F5B82E]/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs text-white/70">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#F5B82E] focus-visible:ring-[#F5B82E]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="mt-2 w-full gap-2 rounded-xl bg-[#F5B82E] text-black hover:bg-[#F5B82E]/90 disabled:bg-[#F5B82E]/50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {activeTab === "signin" ? "Signing In…" : "Creating Account…"}
                  </>
                ) : activeTab === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-white/30">
              {activeTab === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signup")}
                    className="text-[#F5B82E] hover:underline cursor-pointer"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setActiveTab("signin")}
                    className="text-[#F5B82E] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
