
export default function CustomBadge({ title, color, fontSize, textColor = "#FFF" }) {
    return (
        <>
            <span
                style={{
                    borderRadius: '8px',
                    backgroundColor: color,
                    padding: '2px 10px',
                    paddingBottom: "3px",
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: textColor ? textColor : '#FFF',
                    fontWeight: 600,
                    fontSize: fontSize ?? "14px",
                }}
            >
                { title }
            </span>
        </>
    )
}