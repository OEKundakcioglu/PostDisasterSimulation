"use strict";(()=>{var e={};e.id=186,e.ids=[186],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2048:e=>{e.exports=require("fs")},5315:e=>{e.exports=require("path")},2498:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>P,patchFetch:()=>h,requestAsyncStorage:()=>T,routeModule:()=>$,serverHooks:()=>D,staticGenerationAsyncStorage:()=>b});var i={};a.r(i),a.d(i,{POST:()=>y});var r=a(3278),n=a(5002),o=a(4877),s=a(1309),l=a(2048),u=a.n(l),d=a(5315),m=a.n(d);let p=new Set(["seedDemandTime","seedDemandQuantity","seedItemDuration","seedSupplyDisruptionTime","seedSupplyDisruptionDuration","seedMigrationTime","seedMigrationQuantity","seedFundingTime","seedFundingAmount","seedReplenishmentTime","seedTransferTime","seedTransshipmentTime","inventoryControlPeriod","planningHorizon","periodicCounts","centralPeriodicCounts","initialInternalPopulation","initialExternalPopulation","initialInventory","initialCentralWarehouseInventory","earmarkedFunds","initialEarmarkedInKind"]);function c(e,t){return"boolean"==typeof t?t.toString():p.has(e)?parseInt(t).toString():isNaN(parseFloat(t))?t:parseFloat(t).toString()}function f(e){switch(e){case"TRIANGULAR":return"DistTriangular";case"EXPONENTIAL":return"DistExponential";case"BERNOULLI":return"DistBernoulli";case"EQUAL_SHARE":return"DistEqualShare";case"FIXED":return"DistFixed";case"UNIFORM":return"DistUniform";default:return""}}function g(e,t){let a="",i=" ".repeat(t);for(let[t,r]of Object.entries(e))"boolean"==typeof r?a+=`${i}${t}: ${r}
`:a+=`${i}${t}: ${c(t,r)}
`;return a}async function y(e){try{let t=await e.json();console.log("Received Data:",JSON.stringify(t,null,2));let a=function(e){let t="",a=new Map;e.items.forEach(e=>{let t="";t="HygieneKit"===e.name?"goods":"Medicine"===e.name?"medicine":e.name.replace(/\s+/g,"_"),a.set(e.name,t)});let i=new Map;e.camps.forEach(e=>{let t="";switch(e.name){case"Hatay-1":t="hatay1";break;case"Hatay-2":t="hatay2";break;case"Hatay-3":t="hatay3";break;case"Adana":t="adana";break;case"Osmaniye":t="osmaniye";break;case"Kilis":t="kilis";break;case"Kahramanmaraş":t="kahramanmaras";break;default:t=e.name.replace(/\s+/g,"_")}i.set(e.name,t)});let r={inventoryControlPeriod:"&period",campBuffer:"&campBuffer",centralBuffer:"&centralBuffer"};for(let[a,i]of(t+="simulationConfig:\n",Object.entries(e.simulationConfig)))a in r?t+=`  ${a}: ${r[a]} ${c(a,i)}
`:t+=`  ${a}: ${c(a,i)}
`;for(let i of(t+="items:\n",e.items)){let e=a.get(i.name);if(t+=`  - &${e}
    name: ${i.name}
    isPerishable: ${i.isPerishable}
    price: ${c("price",i.price)}
    orderingCost: ${c("orderingCost",i.orderingCost)}
    holdingCost: ${c("holdingCost",i.holdingCost)}
    deprivationRate: ${c("deprivationRate",i.deprivationRate)}
    deprivationCoefficient: ${c("deprivationCoefficient",i.deprivationCoefficient)}
    referralCost: ${c("referralCost",i.referralCost)}
`,i.isPerishable){if(!i.durationData)throw console.error(`Item "${i.name}" is perishable but durationData is missing.`),Error(`Item "${i.name}" is perishable but durationData is missing.`);t+=`    durationData:
      distributionType: ${i.durationData.distributionType}
      distParameters: !!data.distribution.${f(i.durationData.distributionType)}
`+g(i.durationData.distParameters,8)}t+=`    leadTimeData:
      distributionType: ${i.leadTimeData.distributionType}
      distParameters: !!data.distribution.${f(i.leadTimeData.distributionType)}
`+g(i.leadTimeData.distParameters,8)}for(let r of(t+="camps:\n",e.camps)){let e=i.get(r.name);for(let i of(t+=`  - &${e}
    name: ${r.name}
    leadTimeData:
      distributionType: ${r.leadTimeData.distributionType}
      distParameters: !!data.distribution.${f(r.leadTimeData.distributionType)}
`+g(r.leadTimeData.distParameters,8)+`    demands:
`,r.demands)){let e=a.get(i.item);t+=`      - item: *${e}
        demandTimingType: ${i.demandTimingType}
        demandQuantityType: ${i.demandQuantityType}
        arrivalData:
          distributionType: ${i.arrivalData.distributionType}
          distParameters: !!data.distribution.${f(i.arrivalData.distributionType)}
`+g(i.arrivalData.distParameters,12)+`        internalRatio: ${Number(i.internalRatio)}
`+`        externalRatio: ${Number(i.externalRatio)}
`}t+=`    campExternalDemandSatisfactionType: ${r.campExternalDemandSatisfactionType}
    populationType: ${r.populationType}
    initialInternalPopulation: ${Number(r.initialInternalPopulation)}
    initialExternalPopulation: ${Number(r.initialExternalPopulation)}
`}for(let a of(t+="agencies:\n",e.agencies))for(let e of(t+=`  - name: ${a.name}
    fundingArray:
`,a.fundingArray))t+=`      - fundingType: ${e.fundingType}
        arrivalData:
          distributionType: ${e.arrivalData.distributionType}
          distParameters: !!data.distribution.${f(e.arrivalData.distributionType)}
`+g(e.arrivalData.distParameters,12)+`        amountData:
`+`          distributionType: ${e.amountData.distributionType}
`+`          distParameters: !!data.distribution.${f(e.amountData.distributionType)}
`+g(e.amountData.distParameters,12);for(let a of(t+="migrations:\n",e.migrations)){let e=i.get(a.fromCamp),r=i.get(a.toCamp);t+=`  - fromCamp: *${e}
    toCamp: *${r}
    migrationType: ${a.migrationType}
    arrivalData:
      distributionType: ${a.arrivalData.distributionType}
      distParameters: !!data.distribution.${f(a.arrivalData.distributionType)}
`+g(a.arrivalData.distParameters,8)+`    migrationRatio: ${Number(a.migrationRatio)}
`}for(let r of(t+="inventoryPolicy: !!simulation.decision.OrderUpToPolicy\n  bufferRatios:\n",e.camps)){let n=i.get(r.name);for(let i of(t+=`    *${n}:
`,e.items)){let e=a.get(i.name);t+=`      *${e}: *campBuffer
`}}for(let i of(t+="  centralBufferRatios:\n",e.items)){let e=a.get(i.name);t+=`    *${e}: *centralBuffer
`}for(let r of(t+="  periodicCounts:\n",e.camps)){let n=i.get(r.name);for(let i of(t+=`    *${n}:
`,e.items)){let e=a.get(i.name);t+=`      *${e}: *period
`}}for(let i of(t+="  centralPeriodicCounts:\n",e.items)){let e=a.get(i.name);t+=`    *${e}: *period
`}for(let r of(t+=`initialState:
  availableFunds: ${parseInt(e.initialState.availableFunds)}
  initialInventory:
`,e.camps)){let n=i.get(r.name);for(let i of(t+=`    *${n}:
`,e.items)){let e=a.get(i.name);t+=`      *${e}: 0
`}}for(let i of(t+="  initialCentralWarehouseInventory:\n",e.items)){let e=a.get(i.name);t+=`    *${e}: 0
`}for(let a of(t+="  earmarkedFunds:\n",e.camps)){let e=i.get(a.name);t+=`    *${e}: 0
`}for(let r of(t+="  initialEarmarkedInKind:\n",e.camps)){let n=i.get(r.name);for(let i of(t+=`    *${n}:
`,e.items)){let e=a.get(i.name);t+=`      *${e}: 0
`}}for(let i of(t+="  isItemAvailable:\n",e.items)){let e=a.get(i.name);t+=`    *${e}: true
`}return console.log("Generated YAML Content:\n",t),t}(t),i=m().join(process.cwd(),"..","src","main","java","data","input_files","input.yaml");u().writeFileSync(i,a,"utf8");let r="http://localhost:8083";r||console.error("NEXT_PUBLIC_API_URL is not defined. Skipping API call.");let n=r?`${r}/simulate/logs`:"";if(console.log("Calling Spring Boot API at:",n),r)try{let e=await fetch(n,{method:"GET",headers:{"Content-Type":"application/json"}});e.ok?console.log("Spring Boot API call successful"):console.warn(`Spring Boot API returned ${e.status}. Continuing with visualization anyway.`)}catch(e){console.error("Error calling Spring Boot API:",e),console.warn("Continuing with visualization despite API error")}return s.NextResponse.json({success:!0,redirectToVisualization:!0,visualizationUrl:"/home/RealTimeVisualization",message:"Simulation data processed. Proceeding to visualization."})}catch(e){return console.error("Error during simulation setup:",e),s.NextResponse.json({error:`Failed to setup simulation: ${e.message}`,success:!1},{status:500})}}let $=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/runSimulation/route",pathname:"/api/runSimulation",filename:"route",bundlePath:"app/api/runSimulation/route"},resolvedPagePath:"/Users/enestanrikulu/Desktop/Jupyter/PostDisasterSimulation/post-disaster-kpi-ui/src/app/api/runSimulation/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:T,staticGenerationAsyncStorage:b,serverHooks:D}=$,P="/api/runSimulation/route";function h(){return(0,o.patchFetch)({serverHooks:D,staticGenerationAsyncStorage:b})}}};var t=require("../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),i=t.X(0,[379,833],()=>a(2498));module.exports=i})();