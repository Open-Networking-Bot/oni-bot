import { GuildMember } from "discord.js"
import getUserData, { CriticalData } from "../features/getUserData"
import config from "../models/config"
import client from "./serverInit"
import database from "./database"
import { WEEK } from "./magicNumbers"
import { members } from "@prisma/client"
import StandardDataFormat from "../models/standardDataFormat"
import dmUser from "../util/dmUser"

const supportTiers = [
    {role_id: config.ninety_percentile_role, percentile: 90},
    {role_id: config.seventy_fifth_percentile_role, percentile: 75},
    {role_id: config.fifty_percentile_role, percentile: 50},
]

/**
 * @author Lewis Page
 * @interface
 * @description The critial data which all database members contain, combined with their GuildMember.
 */
interface UserInfo extends CriticalData {
    discordMember : GuildMember
}

/**
 * @author Lewis Page
 * @interface
 * @description UserInfo combined with the calculated figures regarding their last week's progress.
 */
interface CalculatedUserInfo extends UserInfo {
    info : StandardDataFormat
}

/**
 * @author Lewis Page
 * @description Finds the last week's data for all members in the Discord Server.
 * @returns A promise, containing the last week's data, the GuildMember, and all related tables, for ever member in the Discord Server.
 */
export async function findDataForAllMembers(){
    const discordMembers = client.guilds.cache.find(i => i.id === config.server_id)!.members.cache.map(i => i)
    const userData : UserInfo[] = []

    const sevenDaysAgo = new Date(new Date().getTime() - WEEK);

    (await database.members.findMany()).forEach((i : members) => {
        userData[i.id].member = i
        userData[i.id].supportEntries = []
        userData[i.id].allEvents = []
        userData[i.id].discordMember = discordMembers.find(m => m.id === i.discordID)!
    });

    (await database.support.findMany({where: {date: {gte: sevenDaysAgo}}})).forEach(i => userData[i.membersId].supportEntries.push(i));
    (await database.eventParticipationHistory.findMany({where: {eventDate: {gte: sevenDaysAgo}}})).forEach(i => userData[i.membersId].allEvents.push(i));

    const calculatedData : CalculatedUserInfo[] = []
    for(let data of userData){
        if(!data) continue;

        const processedData = getUserData(data, true, {
            weeksToConsider: 1,
            dateToStartFrom: sevenDaysAgo,
            definitionOfWeek: WEEK
        })

        calculatedData.push({...data, info: processedData})
    }

    return calculatedData
}

/**
 * @author Lewis Page
 * @description Assigns the correct roles into the people in the correct percentiles.
 * @returns A promise of void
 */
export async function refreshSupportTiers(){

    const calculatedData = await findDataForAllMembers()

    calculatedData.sort((a, b) => b.info.totalPoints - a.info.totalPoints)

    const dataLength = calculatedData.length
    for (let i = 0; i < dataLength; i++) {
        const element = calculatedData[i];
        const centile = (i / dataLength) * 100

        let highestTier : any = undefined;
        for(let s = 0; s < supportTiers.length; s++){
            const tier = supportTiers[s]
            if(tier.percentile <= centile){
                await element.discordMember.roles.add(tier.role_id)
                highestTier = tier
            }
            else if(element.discordMember.roles.cache.has(tier.role_id)) {
                element.discordMember.roles.remove(tier.role_id)
                highestTier = s - 1 === -1 ? null : supportTiers[s - 1]
            }
        }

        if(highestTier !== undefined)
            dmUser(element.discordMember,
         `Hey <@${element.discordMember.id}>, you are now in the top ${!!highestTier ? highestTier.percentile: "100"}% of members!`).then().catch()
    }
}