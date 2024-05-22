import { Spinner } from "@shopify/polaris";

export default function Loader () {
    return (
        <>
        <div style={{position:"fixed" , inset:"0px", backgroundColor:"rgba(255,255,255,0.7)", zIndex:"999", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <Spinner size="large" />
        </div>
            
        </>
    )
}