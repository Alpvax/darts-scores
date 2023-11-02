<script lang="ts">
    export let players: string[];
    export let gameData: Map<string, (number | undefined)[]>;
    const gameDataMap = new Map<string, Map<number, number>>();
    $: for (const [k, v] of gameData.entries()) {
        if (!gameDataMap.has(k)) {
            gameDataMap.set(k, new Map());
        }
        const map = gameDataMap.get(k)!;
        for (const [i, h] of v.entries()) {
            const r = i + 1;
            if (h === undefined) {
                map.delete(r);
            } else {
                map.set(r, h);
            }
        }
    }
    export let editable = true;

    const rounds = Array.from({ length: 20 }, (_, i) => {
    const r = i + 1;
    return {
      label: r.toString(),
      display: (score, delta, hits, editable, focus) => (
        // <>
        //   <span>{score}</span>
        //   <sup>({numfmt.format(delta)})</sup>
        //   {editable ? (
        //     <input
        //       class="hitsInput"
        //       type="number"
        //       min="0"
        //       max="3"
        //       placeholder="0"
        //       value={hits.value}
        //       onInput={(e) => {
        //         const val = parseInt((e.target as HTMLInputElement).value);
        //         hits.value = isNaN(val) ? undefined : val;
        //         e.preventDefault();
        //       }}
        //       onKeydown={onKey(hits, focus)}
        //     />
        //   ) : undefined}
        // </>
      ),
      deltaScore: (h, i) => 2 * (i + 1) * (h === undefined || h <= 0 ? -1 : h),
      rowClass: (data) => {
        const values = data.map((d) => d.value);
        return {
          current: values.some((v) => v !== undefined) && values.some((v) => v === undefined),
          untaken: values.every((v) => v === undefined),
          allMissed: values.every((v) => v !== undefined && v < 1),
          allHit: values.every((v) => v),
        };
      },
      cellClass: ({ value }) => {
        switch (value) {
          case 0:
            return "turn27 miss";
          case 1:
            return "turn27 hit";
          case 2:
            return "turn27 doubledouble";
          case 3:
            return "turn27 cliff";
          default:
            return "turn27";
        }
      },
    };
  })

    //TODO: PlayerData

    function playerNameClass(pid: string) {
        const rounds = gameDataMap.get(pid);
        const classes = ["playerName"]
        if (rounds !== undefined && rounds.size > 0) {
          if ([...rounds.values()].reduce((a, r) => a + r) <= 0) {
            classes.push("fatNick")
          }
          //TODO: if (!scores.filter((_, i) => rounds.has(i)).some((s) => s < 0)) {
          //   classes.push("allPositive")
          // }
        }
        return classes.join(" ")
    }
</script>

<table>
    <thead>
      <tr>
        <slot name=topLeftCell><th>&nbsp;</th></slot>
        {#each players as pid}
        <th class={playerNameClass(pid)}>{pid}</th>
        <!-- <th class={playerNameClass(pid)}>{playerStore.playerName(pid)}}</th> -->
        {/each}
      </tr>
      <!-- {posRow("head")} -->
    </thead>
    <tbody>
      <!-- {posRow("body")} -->
      {#each rounds as r}
        <tr class={rowClass}>
          <td class="rowLabel">{r.label}</td>
          {#each players as pid}
          <td class={cellClass} data-round-index={idx}>
            TODO: rounds
            <!-- {r.display(
              score,
              deltaScore,
              computed({
                get: () => value,
                set: (val) => {
                  turnData.value.set(
                    makeTurnKey(playerId, round),
                    val as RoundsValue<T>,
                  );
                  emit("turnTaken", playerId, round, {
                    score,
                    deltaScore,
                    value: val as RoundValue<T, typeof round>,
                  });
                  moveFocus.empty();
                },
              }),
              props.editable,
              moveFocus,
            )} -->
          </td>
          {/each}
          <!-- {playerRowData.map(({ playerId, score, deltaScore, value }, pIdx) => {
            const cellClass = extendClass(
              r.cellClass !== undefined
                ? () => r.cellClass!({ playerId, score, deltaScore, value })
                : undefined,
              "turnInput",
              { unplayed: value === undefined },
            );
            const moveFocus = makeMoveFocus(pIdx, idx);
            return (
              <td class={cellClass} data-round-index={idx}>
                {r.display(
                  score,
                  deltaScore,
                  computed({
                    get: () => value,
                    set: (val) => {
                      turnData.value.set(
                        makeTurnKey(playerId, round),
                        val as RoundsValue<T>,
                      );
                      emit("turnTaken", playerId, round, {
                        score,
                        deltaScore,
                        value: val as RoundValue<T, typeof round>,
                      });
                      moveFocus.empty();
                    },
                  }),
                  props.editable,
                  moveFocus,
                )}
              </td>
            );
          })} -->
        </tr>
      {/each}
    </tbody>
    <!-- {props.displayPositions === "foot" || slots.footer ? (
      <tfoot>{[posRow("foot"), (slots.footer as () => any)()]}</tfoot>
    ) : (
      {}
    )} -->
  </table>