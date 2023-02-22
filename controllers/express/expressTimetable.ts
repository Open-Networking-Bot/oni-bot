import { Message, MessageAttachment } from "discord.js";
import path from "path";
import config from "../../functions/models/config";
import database from "../../functions/core/database";
import rootDir from "../../functions/util/rootDir";
import fs from "fs/promises"
import csvMaker from "../../functions/util/csvMaker";
import { WEEK } from "../../functions/core/magicNumbers";

export default async function(message : Message){
    const fullTimetable = await database.expressTimetable.findMany()

    const csv : string[][] = [["Discord Username", "Twitch Username", "Slot"]]
    for(let i = 1; i <= config.express_max_slots; i++){

        let found = false
        for(let slot of fullTimetable){
            if(i == slot.slot) {
                found = true
                const member = await database.members.findUnique({where: {id: slot.membersId}})
                if(!member) {
                    csv.push(["user not in database", "url not in database", slot.slot.toString()])
                    break
                }

                csv.push([member.name, !!member.url ? member.url : "url not in database", slot.slot.toString()])
                break
            }
        }
        if(!found) csv.push(["", "", i.toString()])
    }

    // Define the file path for the record
    const filePath = path.join(rootDir, "data", "timetable.csv")

    // Create the CSV file
    await fs.writeFile(filePath, csvMaker(csv))
 
    // Send the file to the end-user
    const file = new MessageAttachment(filePath, `Timetable__${new Date(new Date().getTime() - WEEK).toDateString()}-${new Date().toDateString()}.csv`)
    await message.reply({files: [file]})
}