import { PolicyDocument, policyMetadata } from "@/features/game/components/PolicyDocument";

export const generateMetadata = () => policyMetadata("privacy");

export default function PrivacyPage() {
  return <PolicyDocument kind="privacy" />;
}
