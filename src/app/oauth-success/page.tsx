"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";


export default function OAuthSuccess(){

const router = useRouter();

const searchParams = useSearchParams();


useEffect(()=>{


const accessToken =
searchParams.get("accessToken");


const refreshToken =
searchParams.get("refreshToken");



if(accessToken && refreshToken){


localStorage.setItem(
"accessToken",
accessToken
);


localStorage.setItem(
"refreshToken",
refreshToken
);



router.replace("/home");


}


},[]);



return (
<div className="flex h-screen items-center justify-center">

<h1>
Logging you in...
</h1>

</div>
)

}