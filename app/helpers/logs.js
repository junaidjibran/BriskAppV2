export function jsonLogs(getData, getText = "" ) {
    return console.log(getText, JSON.stringify(getData, null, 4))
}