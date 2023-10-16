<script setup lang="ts">
import RoundBased from "../components/game/RoundBased";
const calcScore = (hits: number[]): number =>
  hits.reduce((s, h, i) => s + 2 * (i + 1) * (h <= 0 ? -1 : h), 27);
</script>

<template>
  <div>
    <RoundBased
      :players="[
        'y5IM9Fi0VhqwZ6gAjil6',
        '6LuRdib3wFxhbcjjh0au',
        'Gt8I7XPbPWiQ92FGsTtR',
        'jcfFkGCY81brr8agA3g3',
        'jpBEiBzn9QTVN0C6Hn1m',
        'k7GNyCogBy79JE4qhvAj',
      ]"
      :gameMeta="{
        data: () =>
          Array.from({ length: 20 }, () => {
            const rand = Math.random();
            return rand < 0.5 ? 0 : rand < 0.8 ? 1 : rand < 0.95 ? 2 : 3;
          }),
        scores: (data: Map<string, number[]>) =>
          new Map([...data.entries()].map(([pid, hits]) => [pid, calcScore(hits)])),
        positionOrder: 'highestFirst',
        rounds: {
          double1: {
            label: '1',
            content: (data: number[]) => `${calcScore(data.slice(0, 1))} (${data[1 - 1]} hits)`,
          },
          double2: {
            label: '2',
            content: (data: number[]) => `${calcScore(data.slice(0, 2))} (${data[2 - 1]} hits)`,
          },
          double3: {
            label: '3',
            content: (data: number[]) => `${calcScore(data.slice(0, 3))} (${data[3 - 1]} hits)`,
          },
          double4: {
            label: '4',
            content: (data: number[]) => `${calcScore(data.slice(0, 4))} (${data[4 - 1]} hits)`,
          },
          double5: {
            label: '5',
            content: (data: number[]) => `${calcScore(data.slice(0, 5))} (${data[5 - 1]} hits)`,
          },
          double6: {
            label: '6',
            content: (data: number[]) => `${calcScore(data.slice(0, 6))} (${data[6 - 1]} hits)`,
          },
          double7: {
            label: '7',
            content: (data: number[]) => `${calcScore(data.slice(0, 7))} (${data[7 - 1]} hits)`,
          },
          double8: {
            label: '8',
            content: (data: number[]) => `${calcScore(data.slice(0, 8))} (${data[8 - 1]} hits)`,
          },
          double9: {
            label: '9',
            content: (data: number[]) => `${calcScore(data.slice(0, 9))} (${data[9 - 1]} hits)`,
          },
          double10: {
            label: '10',
            content: (data: number[]) => `${calcScore(data.slice(0, 10))} (${data[10 - 1]} hits)`,
          },
          double11: {
            label: '11',
            content: (data: number[]) => `${calcScore(data.slice(0, 11))} (${data[11 - 1]} hits)`,
          },
          double12: {
            label: '12',
            content: (data: number[]) => `${calcScore(data.slice(0, 12))} (${data[12 - 1]} hits)`,
          },
          double13: {
            label: '13',
            content: (data: number[]) => `${calcScore(data.slice(0, 13))} (${data[13 - 1]} hits)`,
          },
          double14: {
            label: '14',
            content: (data: number[]) => `${calcScore(data.slice(0, 14))} (${data[14 - 1]} hits)`,
          },
          double15: {
            label: '15',
            content: (data: number[]) => `${calcScore(data.slice(0, 15))} (${data[15 - 1]} hits)`,
          },
          double16: {
            label: '16',
            content: (data: number[]) => `${calcScore(data.slice(0, 16))} (${data[16 - 1]} hits)`,
          },
          double17: {
            label: '17',
            content: (data: number[]) => `${calcScore(data.slice(0, 17))} (${data[17 - 1]} hits)`,
          },
          double18: {
            label: '18',
            content: (data: number[]) => `${calcScore(data.slice(0, 18))} (${data[18 - 1]} hits)`,
          },
          double19: {
            label: '19',
            content: (data: number[]) => `${calcScore(data.slice(0, 19))} (${data[19 - 1]} hits)`,
          },
          double20: {
            label: '20',
            content: (data: number[]) => `${calcScore(data.slice(0, 20))} (${data[20 - 1]} hits)`,
          },
        },
        rows: [
          'double1',
          'double2',
          'double3',
          'double4',
          'double5',
          'double6',
          'double7',
          'double8',
          'double9',
          'double10',
          'double11',
          'double12',
          'double13',
          'double14',
          'double15',
          'double16',
          'double17',
          'double18',
          'double19',
          'double20',
          {
            label: 'finalRange for 5',
            content: (data: number[]) => {
              const score = calcScore(data.slice(0, 4));
              return `${score - (420 - 5 * (5 - 1))} - ${score + 3 * (420 - 5 * (5 - 1))}`;
            },
          },
        ],
      }"
    />
  </div>
</template>
