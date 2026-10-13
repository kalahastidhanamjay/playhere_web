import { Compass } from "lucide-react";
import { ButtonLink, Empty } from "@/components/ui";

export default function NotFoundPage() {
  return (
    <div className="page">
      <Empty icon={Compass} title="Page not found" message="That link doesn't lead anywhere. It may have been moved or removed." action={<ButtonLink to="/">Go home</ButtonLink>} />
    </div>
  );
}
