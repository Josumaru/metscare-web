"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function ProfilePage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = Cookies.get("token");
    setToken(t || null);

    // kalau ada user di cookie, gunakan dulu itu (cepat)
    const userCookie = Cookies.get("user");
    if (userCookie) {
      try {
        setProfile(JSON.parse(userCookie));
      } catch (e) {
        // ignore
      }
    }

    if (t) fetchProfile(t);
  }, []);

  async function fetchProfile(token: string) {
    try {
      const res = await fetch("https://metscare-be.vercel.app/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.data) {
        setProfile(json.data);
        Cookies.set("user", JSON.stringify(json.data), { expires: 7 });
      }
    } catch (err) {
      console.error(err);
    }
  }

  function isPhoneIdentifier(input: string) {
    // anggap phone jika hanya angka dan spasinya, atau dimulai + diikuti angka
    const trimmed = input.trim();
    // pola: optional +, lalu 7-15 digit (batas umum)
    const phoneRegex = /^\+?\d{7,15}$/;
    return phoneRegex.test(trimmed);
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const identifier = (form.get("identifier") as string) || "";
    const password = (form.get("password") as string) || "";

    if (!identifier || !password) {
      toast("Mohon isi kolom terlebih dahulu");
      setLoading(false);
      return;
    }

    // tentukan payload: kalau nomor -> kirim phone, kalau ada @ -> kirim email
    const payload: any = { password };
    if (identifier.includes("@")) {
      payload.email = identifier.trim();
    } else if (isPhoneIdentifier(identifier)) {
      // kirim sebagai phone (sesuai API backendmu)
      payload.phone = identifier.trim();
    } else {
      // fallback: kirim sebagai email
      payload.email = identifier.trim();
    }

    try {
      const res = await fetch(
        "https://metscare-be.vercel.app/api/auth/sign-in",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        // backend mungkin pakai kode 200 untuk error tertentu — cek message
        toast("Pastikan email/nomormu dan password anda benar", {});
        setLoading(false);
        return;
      }

      const data = json?.data;
      if (data?.token) {
        Cookies.set("token", data.token, { expires: 7 });
        if (data.user) {
          Cookies.set("user", JSON.stringify(data.user), { expires: 7 });
          setProfile(data.user);
        }
        setToken(data.token);
      } else {
        toast("Login tidak berhasil. Pastikan email/nomor dan password benar.");
      }
    } catch (err) {
      console.error(err);
      toast("Terjadi kesalahan saat login. Coba lagi nanti");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Apakah anda yakin ingin menghapus akun ini?"))
      return;
    try {
      const t = Cookies.get("token");
      if (!t) {
        toast("Kamu perlu login terlebih dahulu");
        return;
      }

      const res = await fetch(
        "https://metscare-be.vercel.app/api/auth/delete-account",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${t}`,
          },
        }
      );

      if (!res.ok) {
        toast("Gagal Menghapus akun");
        return;
      }

      Cookies.remove("token");
      Cookies.remove("user");
      setToken(null);
      setProfile(null);
      toast("Akun berhasil dihapus");
    } catch (err) {
      toast("Terjadi kesalahan");
    }
  }

  // ---------- BELUM LOGIN ----------
  if (!token) {
    return (
      <Card className="max-w-sm mx-auto mt-20 p-6">
        <CardHeader>
          <CardTitle>Masuk dulu ya… 🌸</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Identifier bisa email atau nomor */}
            <Input
              name="identifier"
              placeholder="Email atau Nomor HP (contoh: +6281234 atau 081234)"
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Sedang masuk..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ---------- SUDAH LOGIN ----------
  return (
    <Card className="max-w-sm mx-auto mt-20 p-6 flex flex-col items-center gap-4">
      <Avatar className="w-24 h-24">
        <AvatarImage src={profile?.avatarUrl || ""} className="object-cover"/>
        <AvatarFallback>{profile?.name?.charAt(0)}</AvatarFallback>
      </Avatar>

      <CardTitle className="text-xl">{profile?.name}</CardTitle>
      <p>{profile?.email || profile?.phoneNumber}</p>

      <Button variant="destructive" onClick={handleDeleteAccount}>
        Hapus Akun
      </Button>
    </Card>
  );
}
