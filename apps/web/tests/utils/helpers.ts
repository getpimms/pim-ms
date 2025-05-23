import { generateRandomName } from "@/lib/names";
import { OG_AVATAR_URL, nanoid } from "@dub/utils";

export const randomId = () => nanoid(24);

// Generate random customer data
export const randomCustomer = () => {
  const externalId = `cus_${randomId()}`;
  const customerName = generateRandomName();

  return {
    externalId,
    name: customerName,
    email: `${customerName.split(" ").join(".").toLowerCase()}@example.com`,
    avatar: `${OG_AVATAR_URL}${externalId}`,
  };
};

export const randomTagName = () => {
  return `e2e-${randomId()}`;
};

export const randomEmail = ({
  domain = "pimms-internal-test.com",
}: {
  domain?: string;
} = {}) => {
  return `${generateRandomName().split(" ").join(".").toLowerCase()}@${domain}`;
};
