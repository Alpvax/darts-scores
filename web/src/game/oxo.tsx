import { normaliseGameMetadata } from "@/gameUtils/gameMeta";
import { normaliseRound } from "@/gameUtils/roundDeclaration";

const makeOxoRound = <V extends any = number>(
  key: string,
  def: {
    label: string;
  },
) => {
  return normaliseRound<V>({
    key,
    label: def.label,
    deltaScore: (val, score) => (score === 1 ? 0 : Math.ceil(score / 2)), //TODO: if value, otherwise half score
    display: (value) => <></>,
  });
};

const oxoRounds = {
  highScore: makeOxoRound("highScore", { label: "High score" }),
  "20": makeOxoRound("20", { label: "20s" }),
};

export const gameMeta = normaliseGameMetadata<number, {}, keyof typeof oxoRounds>({
  startScore: () => 0,
  positionOrder: "highestFirst",
  rounds: [oxoRounds.highScore],
});
