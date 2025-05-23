import { currencyFormatter, DUB_WORDMARK, formatDate } from "@dub/utils";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { Footer } from "../components/footer";

export function PartnerPayoutSent({
  email = "cheers@pimms.io",
  program = {
    id: "prog_CYCu7IMAapjkRpTnr8F1azjN",
    name: "PiMMs",
    logo: DUB_WORDMARK,
  },
  payout = {
    id: "po_8VuCr2i7WnG65d4TNgZO19fT",
    amount: 490,
    startDate: new Date("2024-11-01"),
    endDate: new Date("2024-11-30"),
  },
}: {
  email: string;
  program: {
    id: string;
    name: string;
    logo: string | null;
  };
  payout: {
    id: string;
    amount: number;
    startDate?: Date | null;
    endDate?: Date | null;
  };
}) {
  const saleAmountInDollars = currencyFormatter(payout.amount / 100, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const startDate = payout.startDate
    ? formatDate(payout.startDate, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const endDate = payout.endDate
    ? formatDate(payout.endDate, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Html>
      <Head />
      <Preview>You've been paid!</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-10 max-w-[500px] rounded-3xl border-[6px] border-solid border-neutral-100 px-10 py-5">
            <Section className="my-8">
              <Img
                src={program.logo || "https://assets.pimms.io/logo.png"}
                height="32"
                alt={program.name}
              />
            </Section>

            <Heading className="mx-0 my-7 p-0 text-lg font-medium text-black">
              You've been paid!
            </Heading>

            <Text className="text-sm leading-6 text-neutral-600">
              <strong className="text-black">{program.name}</strong> has sent
              you <strong className="text-black">{saleAmountInDollars}</strong>
              {startDate && endDate ? (
                <>
                  {" "}
                  for affiliate sales made from{" "}
                  <strong className="text-black">{startDate}</strong> to{" "}
                  <strong className="text-black">{endDate}</strong>.
                </>
              ) : (
                "."
              )}
            </Text>
            <Text className="text-sm leading-6 text-neutral-600">
              The funds are on their way to your account.
            </Text>
            <Footer email={email} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default PartnerPayoutSent;
