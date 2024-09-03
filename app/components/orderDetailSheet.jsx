import { dataTimeFormat } from '../helpers/dataFormat';
import CustomBadge from './badge';

export default function OrderDetailSheet({ data }) {
	// console.log("data..........", data);
	return (
		<>
			<div className="briskApp__order_print_wrap" style={{ fontFamily: "system-ui" }}>
				<div
					style={{
						border: "1px solid #ccc",
						padding: "20px",
						// maxWidth: "800px",
						// margin: "0 auto",
					}}
				>
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
							<h2 style={{ margin: "0" }}>Order Summary</h2>
						</div>
						<div>
							<h2 style={{ margin: "0", fontSize: "18px", }}>
								Order {data?.name}
							</h2>
							<p style={{ margin: "0", fontSize: "14px", }}>{dataTimeFormat(data?.createdAt)}</p>
							<br/>
							<h2 style={{ margin: "0", fontSize: "18px", }}>
								Shipping Address
							</h2>
							<p style={{ margin: "0", fontSize: "14px", }}>{ data?.shippingAddress?.address1 }</p>
							<p style={{ margin: "0", fontSize: "14px", }}>{ data?.shippingAddress?.address2 }</p>
							<p style={{ margin: "0", fontSize: "14px", }}>{ data?.shippingAddress?.city } {"  "} { data?.shippingAddress?.zip }</p>
							<p style={{ margin: "0", fontSize: "14px", }}>{ data?.shippingAddress?.province }</p>
							<p style={{ margin: "0", fontSize: "14px", }}>{ data?.shippingAddress?.country }</p>
						</div>
					</div>

					<table style={{ borderCollapse: "collapse", width: "100%" }}>
						{data?.lineItems.length && data?.lineItems.map((item, index) => {
							return (
								<tr key={`lineitems-${index}`}>
									<td style={{ border: "1px solid #ddd",padding: "8px" }}>
										<img
											src={item?.image?.url}
											alt=""
											style={{ width: "100%", height: "auto", maxWidth: "50px", marginRight: "10px" }}
										/>
									</td>
									<td style={{ border: "1px solid #ddd",padding: "8px" }}>
										<div style={{ display: "flex", gap: "5px", flexDirection: "column" }}>

											<p style={{ margin: "0" }}>{item?.title} </p>
											<div>
												<CustomBadge textColor="#000" fontSize="13px" color="rgba(227,227,227,1)" title={ item?.variant?.title } />
												{/* <span style={{
													borderRadius: "8px",
													backgroundColor: 'rgba(227,227,227,1)',
													fontSize: '12px',
													textAlign: 'center',
													display: 'inline-flex',
													alignItems: 'center',
													fontWeight: 500,
													padding: '5px 10px',
												}}>
													{ item?.variant?.title }
												</span> */}
											</div>
											{ item?.sku && item?.sku.length && (
												<div> 
													<span style={{ fontSize: "13px", fontWeight: "600" }}>Sku:</span>
													{"  "}
													{ item?.sku }
												</div>
											) }
											<div> 
												<span style={{ fontSize: "13px", fontWeight: "600" }}>Manufacturing Status:</span>
												 {"  "}
												<CustomBadge fontSize="13px" color={ item?.manufacturingStatus?.color_code } title={ item?.manufacturingStatus?.title } />
												{/* <span style={{
													backgroundColor: item?.backgroundColor,
													borderRadius: '8px',
													padding: '5px 10px',
													textAlign: 'center',
													display: 'inline-flex',
													alignItems: 'center',
													color: '#FFF',
													fontWeight: 500,
													fontSize: "12px",
													//margin:"5px 5px"
												}}>
													{ item?.savedStatus }
												</span> */}
											</div>
										</div>
									</td>
									<td style={{ border: "1px solid #ddd",padding: "8px" }}>
										<p style={{ margin: "0", textAlign: "right" }}>
											{item?.originalUnitPriceSet?.presentmentMoney?.amount} {item?.originalUnitPriceSet?.presentmentMoney?.currencyCode} x<span>{item?.quantity}</span>
										</p>
									</td>
								</tr>
								// <div key={`lineitems-${index}`}>
								// 	<div
								// 		style={{
								// 			display: "flex",
								// 			justifyContent: "space-between",
								// 			alignItems: "center",
								// 			marginBottom: "10px",
								// 			borderBottom: "1px solid #ccc",
								// 			paddingBottom: "10px",
								// 		}}
								// 	>

								// 		<div style={{ flex: "1" }}>
								// 			<p style={{ margin: "0" }}>{item?.title} </p>
								// 			<div>
								// 				<span style={{
								// 					borderRadius: "8px",
								// 					backgroundColor: 'rgba(227,227,227,1)',
								// 					fontSize: '12px',
								// 					textAlign: 'center',
								// 					display: 'inline-flex',
								// 					alignItems: 'center',
								// 					fontWeight: 500,
								// 					padding: '5px 10px',
								// 				}}>
								// 					{
								// 						item?.variant?.title
								// 					}
								// 				</span>
								// 			</div>
								// 			<div> Manufacturing Status:
								// 				<span style={{
								// 					backgroundColor: item?.backgroundColor,
								// 					borderRadius: '8px',
								// 					padding: '5px 10px',
								// 					textAlign: 'center',
								// 					display: 'inline-flex',
								// 					alignItems: 'center',
								// 					color: '#FFF',
								// 					fontWeight: 500,
								// 					fontSize: "12px",
								// 					//margin:"5px 5px"
								// 				}}>
								// 					{item?.savedStatus}
								// 				</span>
								// 			</div>
								// 			<p style={{ margin: "0", textAlign: "right" }}>
								// 				{item?.originalUnitPriceSet?.presentmentMoney?.amount} {item?.originalUnitPriceSet?.presentmentMoney?.currencyCode} x<span>{item?.quantity}</span>
								// 			</p>
								// 		</div>
								// 	</div>
								// </div>
							)
						})}
					</table>




					{/* <div style={{ width: "100%", display: "flex" }}>
						<div style={{ width: "40%" }}></div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								width: "60%",
								marginTop: "10px",
							}}
						>
							<div style={{ textAlign: "left", flex: "1", fontSize: "16px" }}>
								<p style={{ margin: "0", color: "#888" }}>Subtotal</p>
								<p style={{ margin: "10px 0", color: "#888" }}>Shipping</p>
								<p style={{ margin: "0", color: "#888" }}>Taxes</p>
								<p
									style={{
										margin: "10px 0",
										borderBottom: "1px solid #ccc",
										borderTop: "1px solid #ccc",
										padding: "20px 0",
										color: "#888",
									}}
								>
									Total
								</p>
							</div>
							<div style={{ textAlign: "right", flex: "1", fontSize: "16px" }}>
								<p style={{ margin: "0" }}>{data?.subtotalPrice} {data?.currencyCode} </p>
								<p style={{ margin: "10px 0" }}>{data?.totalShippingPrice} {data?.currencyCode} </p>
								<p style={{ margin: "0" }}>{data?.totalTax} {data?.currencyCode} </p>
								<p
									style={{
										margin: "10px 0",
										borderBottom: "1px solid #ccc",
										borderTop: "1px solid #ccc",
										padding: "20px 0",
									}}
								>
									{data?.totalPrice} {data?.currencyCode}
								</p>
							</div>
						</div>
					</div> */}
				</div>
			</div>
		</>
	);
}
