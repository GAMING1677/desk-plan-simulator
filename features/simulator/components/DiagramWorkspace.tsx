import { TopView } from "./TopView";
import { FrontView } from "./FrontView";
import { SideView } from "./SideView";
import type { SimulatorController } from "../simulator";
export function DiagramWorkspace(props: SimulatorController) {
  const { measures, setMeasures } = props;
  return (
    <section className="canvas-area" aria-label="机の三面図">
      <div className="canvas-header">
        <div>
          <small>{"WORKSPACE / 01"}</small>
          <h1>{"机上レイアウト"}</h1>
        </div>
        <label className="measure-toggle">
          <input
            type="checkbox"
            checked={measures}
            onChange={(event) => setMeasures(event.target.checked)}
          />
          {"寸法を表示"}
        </label>
      </div>

      <div className="views">
        <TopView {...props} />

        <div className="lower-views">
          <FrontView {...props} />

          <SideView {...props} />
        </div>
      </div>
    </section>
  );
}
