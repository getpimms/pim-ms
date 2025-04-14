import { GridPlus } from "@dub/ui/icons";
import { StepPage } from "../step-page";
import { Form } from "./form";

export default function Workspace() {
  return (
    <StepPage
      icon={GridPlus}
      title="Create a workspace"
      description={
        <a
          href="https://pimms.io"
          target="_blank"
          className="underline transition-colors hover:text-neutral-700"
        >
          
        </a>
      }
    >
      <Form />
    </StepPage>
  );
}
