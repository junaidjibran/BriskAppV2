import { dataTimeFormat } from "../helpers/dataFormat"
import CustomBadge from "./badge"

export default function DesignSheet({ orderData, lineItem }) {
    return (
        <>
            <div className="briskApp__order_print_wrap" style={{ fontFamily: "system-ui" }}>
                <div style={{ margin: "10px 0", border: "1px solid #ddd", padding: "15px" }}>
                    <div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: "10px",
							paddingBottom: "10px",
						}}
					>
						<div>
                            <h2 style={{ margin: "0", fontSize: "18px", }}>
								Order {orderData?.order_name}
							</h2>
							{/* <h2 style={{ margin: "0" }}>Order Summary</h2> */}
						</div>
						<div>
							<p style={{ margin: "0", fontSize: "14px", }}>{dataTimeFormat(orderData?.created_at)}</p>
						</div>
					</div>
                    {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <h3>Line Items</h3>
                        <h2>Order {orderData?.orderName}</h2>
                    </div> */}
                    <div style={{ marginTop: "10px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
                        <img src={lineItem?.image} alt={lineItem?.title} style={{ maxWidth: "100px", maxHeight: "100px", border: "1px solid #ddd", borderRadius: "4px" }} />
                        <div style={{ display: "flex", gap: "5px", flexDirection: "column", alignItems: "flex-start" }}>
                            <h3 style={{ fontWeight: "600", margin: "2px 0" }}>{lineItem?.title}</h3>
                            <CustomBadge title={ lineItem?.variantTitle } color="rgba(227,227,227,1)" textColor="#000" fontSize="12px" />
                            { lineItem?.sku && lineItem?.sku.length && (
                                <div> 
                                    <span style={{ fontSize: "13px", fontWeight: "600" }}>Sku:</span>
                                    {"  "}
                                    { lineItem?.sku }
                                </div>
                            ) }
                            { lineItem?.quantity && (
                                <div> 
                                    <span style={{ fontSize: "13px", fontWeight: "600" }}>Quantity:</span>
                                    {"  "}
                                    { lineItem?.quantity }
                                </div>
                            ) }
                            {/* <h5 style={{ fontWeight: "bold", margin: "0 0 5px", fontSize: "12px" }}>SKU: {lineItem?.sku}</h5> */}
                            {/* <p style={{margin: "0", fontSize: "14px"}}>Price: { data?.lineItem.originalUnitPriceSet?.presentmentMoney?.amount } { lineItem?.originalUnitPriceSet?.presentmentMoney?.currencyCode } </p> */}
                            {/* <h5 style={{ margin: "0", fontSize: "12px", fontWeight: "bold" }}>Quantity: {lineItem?.quantity}</h5> */}
                        </div>
                    </div>
                </div>

                <div style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {/* <table style={{ borderCollapse: "collapse", width: "100%"}}>
                        {
                            lineItem?.customAttributes.map(item => (
                                !item?.img_cdn && (
                                    <tr key={item.title_english + '---' + item.value_english + '---' + item.id}>
                                        <td style={{ border: "1px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                            { item.title_english }
                                        </td>
                                        <td style={{ border: "1px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                            { item.value_english?.includes("FitSure") ? "FitSure" : item?.value_english }
                                        </td>
                                        <td style={{ border: "1px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                            { item.title_urdu ?? "-" }
                                        </td>
                                        <td style={{ border: "1px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                            { item.value_urdu ?? "-" }
                                        </td>
                                    </tr>
                                )
                            ))
                        }
                    </table> */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0px" }}>
                        {
                            lineItem?.customAttributes.map(item => (
                                !item?.img_cdn && (
                                    <div key={item.title_english + '---' + item.value_english + '---' + item.id}>
                                        <div style={{ border: "0.5px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                            {/* { item?.title_english } : { item?.value_english?.includes("FitSure") ? "FitSure" : item?.value_english } */}
                                            { item?.title_english ?? "-" } : { item?.value_english ?? "-" }
                                            <br />
                                            { item?.title_urdu ?? "-" } : { item?.value_urdu ?? "-" }
                                        </div>
                                        {/* <div style={{ border: "0.5px solid #dddddd", textAlign: "left", padding: "2px", backgroundColor: "#f2f2f2", fontSize: "12px" }}>
                                        </div> */}
                                    </div>
                                )
                            ))
                        }
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "5px" }}>
                        {/* {
                            lineItem?.customAttributes.map(item => 
                                item?.img_cdn && (
                                        <div key={item.title_english + '--' + item.value_english + '--' + item.id}>
                                            <img src={item.img_cdn} alt="" style={{ width: "100%", height: "auto", display: "block", border: "1px solid #ddd", borderRadius: "4px" }} />
                                            <div>
                                                <h3 style={{ fontSize: "12px", fontWeight: "600" }}>{item.title_english}: </h3>
                                                <p style={{ fontSize: "12px", }}> {item.value_english}</p>
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: "12px", fontWeight: "600" }}>{item.title_urdu ?? "-"}: </h3>
                                                <p style={{ fontSize: "12px", }}> {item.value_urdu ?? "-"}</p>
                                            </div>
                                        </div>
                                    )
                                
                            
                        } */}
                        {lineItem?.customAttributes.map((item, index) => (
                            item?.img_cdn && (
                                <div 
                                    style={{ border: "1px solid #ddd", padding: "5px" }}
                                    key={`${item.title_english}--${item.value_english}--${item.id}`}>
                                    <img 
                                        src={item.img_cdn} 
                                        alt="" 
                                        style={{ 
                                            width: "100%", 
                                            height: "auto", 
                                            display: "block", 
                                            border: "1px solid #ddd", 
                                            borderRadius: "4px" 
                                        }} 
                                    />
                                    <div style={{ marginBottom: "8px"}}>
                                        <h3 style={{ fontSize: "12px", fontWeight: "600", margin: "2px 0" }}>{item.title_english}: </h3>
                                        <p style={{ fontSize: "12px", margin: "2px 0" }}> {item.value_english}</p>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: "12px", fontWeight: "600", margin: "2px 0" }}>{item.title_urdu ?? "-"}: </h3>
                                        <p style={{ fontSize: "12px", margin: "2px 0" }}> {item.value_urdu ?? "-"}</p>
                                    </div>
                                </div>
                            )
                        ))}

                    </div>
                </div>
            </div>
        </>
    )
}