import { generateRandomName } from "@/lib/names";
import useWorkspace from "@/lib/swr/use-workspace";
import { Customer } from "@/lib/types";
import { ChartActivity2 } from "@dub/ui";
import Link from "next/link";

export function CustomerRowItem({ customer }: { customer: Customer }) {
  const { slug } = useWorkspace();
  const display = customer.email || customer.name || generateRandomName();

  return (
    <>
      <Link
        href={`/${slug}/customers/${customer.id}`}
        scroll={false}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-stone-100"
      >
        <div className="flex items-center gap-3 truncate" title={display}>
          {/* <img
            alt={display}
            src={customer.avatar || ""}
            className="size-4 shrink-0 rounded-full border-[6px] border-neutral-100"
          /> */}
          <span className="truncate">{display}</span>
        </div>
        {/* <ChartActivity2 className="size-3.5 shrink-0" /> */}
      </Link>
    </>
  );
}
