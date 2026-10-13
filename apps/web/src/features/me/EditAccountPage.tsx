import { useQueryClient } from "@tanstack/react-query";
import { Image, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Chips, TextArea, TextInput } from "@/components/forms";
import { useAction } from "@/components/overlay";
import { Avatar, Button, PageHeader, SkeletonList } from "@/components/ui";
import { accountApi, useProfile } from "@/data/account";
import { useSession } from "@/lib/session";

export default function EditAccountPage() {
  const { account, updateName } = useSession();
  const profile = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [run, loading] = useAction();
  const [name, setName] = useState(account?.name ?? "");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [gender, setGender] = useState<string>("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setLocation(p.location ?? "");
    setBio(p.bio ?? "");
    setPhoto(p.profilePhotoUrl ?? "");
    setGender(p.gender ?? "");
  }, [profile.data]);

  if (profile.isPending && !profile.isError) return <div className="page page-narrow"><SkeletonList count={4} height={70} /></div>;
  const photoError = photo.trim() && !photo.trim().startsWith("http") ? "Enter a full https:// link" : null;

  return (
    <div className="page page-narrow">
      <PageHeader back title="Edit profile" />
      <div className="stack" style={{ alignItems: "center", marginBottom: 20 }}>
        <Avatar name={name || "?"} src={photo.trim()} size={96} ring />
      </div>
      <form
        className="stack"
        style={{ gap: 20 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setTouched(true);
          if (!name.trim() || photoError) return;
          const parts = name.trim().split(/\s+/);
          const ok = await run(async () => {
            if (name.trim() !== account?.name) await updateName(name);
            await accountApi.updateProfile({
              displayName: name.trim(),
              firstName: parts[0],
              lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
              profilePhotoUrl: photo.trim() || null,
              bio: bio.trim() || null,
              gender: gender || null,
              location: location.trim() || null,
            });
          }, "Profile saved");
          if (ok) {
            void queryClient.invalidateQueries({ queryKey: ["profile"] });
            navigate(-1);
          }
        }}
      >
        <TextInput label="Full name" icon={UserRound} maxLength={100} value={name} onValue={setName} error={touched && !name.trim() ? "Name is required" : null} />
        <TextInput label="City" icon={MapPin} placeholder="Where you play most" value={location} onValue={setLocation} />
        <Chips
          label="Gender"
          value={gender}
          onChange={setGender}
          options={[
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
            { value: "OTHER", label: "Other" },
            { value: "", label: "Prefer not to say" },
          ]}
        />
        <TextArea label="Bio" placeholder="A line or two about you" maxLength={200} value={bio} onValue={setBio} />
        <TextInput label="Photo URL" icon={Image} placeholder="Optional, https://…" value={photo} onValue={setPhoto} error={touched ? photoError : null} />
        <Button type="submit" size="lg" block loading={loading}>Save changes</Button>
      </form>
    </div>
  );
}
