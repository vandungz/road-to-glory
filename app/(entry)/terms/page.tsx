import { PolicyDocument, policyMetadata } from "@/features/game/components/PolicyDocument";

export const generateMetadata = () => policyMetadata("terms");

export default function TermsPage() {
  return <PolicyDocument kind="terms" />;
}
