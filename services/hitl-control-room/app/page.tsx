import { Board } from "@/components/Board";
import { snapshot } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Board initial={snapshot()} />;
}
