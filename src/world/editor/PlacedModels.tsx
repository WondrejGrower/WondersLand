import { Suspense } from "react";
import { Cottage } from "../Cottage";
import { GardenBoard } from "../GardenBoard";
import { GrowBeds } from "../GrowBeds";
import { PLACED_MODELS } from "../layout";
import { EntranceArch, Greenhouse } from "../Plaza";
import { WelcomeSign } from "../WelcomeSign";

/** Decorative copies created in the session-only layout editor. */
export function PlacedModels() {
  return (
    <Suspense fallback={null}>
      {PLACED_MODELS.map((item) => {
        const position: [number, number, number] = [item.x, 0, item.z];
        if (item.type === "arch") return <EntranceArch key={item.id} position={position} rotation={item.rot} scale={item.scale} />;
        if (item.type === "cottage") return <Cottage key={item.id} position={position} rotation={item.rot} modelScale={item.scale} interactive={false} />;
        if (item.type === "greenhouse") return <Greenhouse key={item.id} position={position} rotation={item.rot} scale={item.scale} />;
        if (item.type === "garden-board") return <GardenBoard key={item.id} position={position} rotation={item.rot} modelScale={item.scale} interactive={false} />;
        if (item.type === "welcome-sign") return <WelcomeSign key={item.id} position={position} rotation={item.rot} modelScale={item.scale} interactive={false} />;
        return <GrowBeds key={item.id} position={[item.x, item.z]} rotation={item.rot} scale={item.scale} />;
      })}
    </Suspense>
  );
}