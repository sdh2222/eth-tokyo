import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack } from "@astryxdesign/core/HStack";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { BANNER_NONE, BANNER_STALE, BANNER_STALE_TAIL, CONTROLS, NAV_LABEL } from "../../copy/en";

// Dev-only foundation check from `astryx docs migration` ("Foundation Smoke Test"),
// followed by the watermark theme on the components the shell uses first.
export function Foundation() {
  const [email, setEmail] = useState("");
  const [verdict, setVerdict] = useState("Checking the layer order");

  useEffect(() => {
    const button = document.querySelector<HTMLButtonElement>("[data-foundation-check] button");
    if (!button) {
      setVerdict("Foundation check page did not render a button.");
      return;
    }
    setVerdict(
      getComputedStyle(button).paddingInline === "0px"
        ? "Foundation broken: an unlayered reset or a later cascade layer is overriding component styles."
        : "Foundation sound: the button keeps its padding.",
    );
  }, []);

  return (
    <VStack gap={6}>
      <Heading level={1}>Foundation check</Heading>
      <Text type="body">{verdict}</Text>

      <div data-foundation-check>
        <VStack gap={4}>
          <Button label="Primary action" variant="primary" />
          <TextInput label="Email" placeholder="you@example.com" value={email} onChange={setEmail} />
          <Card>One card with default padding</Card>
          <Table
            data={[{ name: "Foundation", status: "ok" }]}
            columns={[
              { key: "name", header: "Name" },
              { key: "status", header: "Status" },
            ]}
          />
        </VStack>
      </div>

      <Section>
        <VStack gap={3}>
          <Heading level={2}>Banners</Heading>
          <Banner
            status="warning"
            title={`${BANNER_STALE} 10 ${BANNER_STALE_TAIL}`}
            container="section"
            endContent={<Button label={CONTROLS} variant="secondary" size="sm" />}
          />
          <Banner
            status="info"
            title={BANNER_NONE}
            container="section"
            isDismissable
            endContent={<Button label={NAV_LABEL.open} variant="secondary" size="sm" />}
          />
        </VStack>
      </Section>

      <Section>
        <VStack gap={3}>
          <Heading level={2}>Status and source</Heading>
          <HStack gap={2} vAlign="center">
            <StatusDot variant="success" label="Window open" />
            <Text type="body">Window open</Text>
          </HStack>
          <HStack gap={2} vAlign="center">
            <StatusDot variant="warning" label="Waiting for price" />
            <Text type="body">Waiting for price</Text>
          </HStack>
          <HStack gap={1}>
            <Token label="Agent spread" />
            <Token label="Terms" />
          </HStack>
          <HStack gap={2}>
            <Button label="Propose to Safe" variant="primary" />
            <Button label="Cancel" variant="secondary" />
            <Button label="Stop the desk" variant="destructive" />
          </HStack>
        </VStack>
      </Section>
    </VStack>
  );
}
