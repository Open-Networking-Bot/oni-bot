import { IntervalInstance } from "../../functions/core/IntervalManager";
import { REFRESH_SUPPORT_TIERS } from "../../functions/core/intervalNames";
import { HOUR } from "../../functions/core/magicNumbers";
import { refreshSupportTiers } from "../../functions/core/supportTiers";

/**
 * @namespace
 * @author Lewis Page
 * @name REFRESH_SUPPORT_TIERS
 * @description Contains the information regarding automatically refreshing the support tiers that members are on.
 */
export default {
    name: REFRESH_SUPPORT_TIERS,
    interval: setInterval(refreshSupportTiers , HOUR)
} as IntervalInstance