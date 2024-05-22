export function dataTimeFormat(getTime) {
    // const dateTimeString = "2023-12-01T08:33:18Z";
    const dateTime = new Date(getTime);

    const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
    };

    const formattedDateTime = dateTime.toLocaleString("en-US", options);
    // console.log(formattedDateTime);
    return formattedDateTime

}