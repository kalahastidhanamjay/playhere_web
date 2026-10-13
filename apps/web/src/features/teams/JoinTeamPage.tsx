import { useQueryClient } from "@tanstack/react-query";
import { Check, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, ButtonLink, Crest, ErrorView, SkeletonList } from "@/components/ui";
import { teamApi, useInvitePreview } from "@/data/teams";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useFeedback } from "@/components/overlay";

/** Landing page for a team invite link: preview the team, then join in one tap. */
export default function JoinTeamPage() {
  const { code = "" } = useParams();
  const preview = useInvitePreview(code);
  const { account } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useFeedback();
  const [loading, setLoading] = useState(false);

  async function join(teamId: string, teamName: string) {
    setLoading(true);
    try {
      await teamApi.joinWithInvite(code);
      void queryClient.invalidateQueries();
      toast("success", `Welcome to ${teamName}!`);
      navigate(`/teams/${teamId}`, { replace: true });
    } catch (e) {
      const err = ApiError.from(e);
      if (err.kind === "conflict" && /player profile/i.test(err.message)) {
        toast("info", "Set up your player profile first, then open the invite again.");
        navigate(`/onboarding?next=${encodeURIComponent(`/join/${code}`)}`);
      } else {
        toast("error", err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  if (preview.isError) return <div className="page page-narrow"><ErrorView error={preview.error} /></div>;
  if (!preview.data) return <div className="page page-narrow"><SkeletonList count={2} height={160} /></div>;
  const team = preview.data;

  return (
    <div className="page page-narrow">
      <div className="card stack" style={{ alignItems: "center", textAlign: "center", gap: 12, padding: "40px 24px" }}>
        <span className="label">You're invited to</span>
        <Crest name={team.name} logo={team.logo} size={104} />
        <h1>{team.name}</h1>
        <p className="muted">{[team.village, `${team.squadSize} players`].filter(Boolean).join(" · ")}</p>
        <div style={{ width: "100%", maxWidth: 360, marginTop: 12 }} className="stack">
          {team.myRole ? (
            <ButtonLink to={`/teams/${team.id}`} icon={Check} block>You're in this team</ButtonLink>
          ) : !account ? (
            <ButtonLink to={`/login?from=${encodeURIComponent(`/join/${code}`)}`} block>Sign in to join</ButtonLink>
          ) : (
            <Button size="lg" block icon={UserPlus} loading={loading} onClick={() => join(team.id, team.name)}>Join {team.name}</Button>
          )}
          <Link to={`/teams/${team.id}`} className="link">View team first</Link>
        </div>
      </div>
    </div>
  );
}
