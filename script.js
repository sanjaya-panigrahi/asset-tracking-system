/**
* New script file
*/
  
/**
  * Transaction Temprature Reading
  * @param {org.asset.tracking.solution.TemperatureReading} txTempReading
  * @transaction
  */
 async function TemperatureReading(txTempReading)
 {
   const factory = getFactory();
   const NS = 'org.asset.tracking.solution';
   const me = getCurrentParticipant();
   const shipment = txTempReading.shipment;
   const contract = shipment.contract;
   
   alert('Adding temperature ' + txTempReading.celsius + ' to shipment ' + shipment.shipmentID);
   
   
   if (shipment.temperatureReadings) {
     shipment.temperatureReadings.push(txTempReading);
   } else {
     shipment.temperatureReadings = [txTempReading];
   }
   
   //Check the Min Temp and Max Temp to Invoke and Emit TemperatureThresholdEvent
   if (txTempReading.celsius < contract.minTemperature || txTempReading.celsius > contract.maxTemperature) {
     
     let temperatureEvent = factory.newEvent(NS, 'TemperatureThresholdEvent');
     temperatureEvent.shipment = shipment;
     temperatureEvent.temperature = txTempReading.celsius;
     temperatureEvent.latitude = txTempReading.latitude;
     temperatureEvent.longitude = txTempReading.longitude;
     temperatureEvent.readingTime = txTempReading.readingTime;
     temperatureEvent.message = 'Temperature Threshold Alert: ' + shipment.shipmentID;
     
     emit(temperatureEvent);
   }
   
   const shipmentRegistry = await getAssetRegistry(NS + '.Shipment');
   await shipmentRegistry.update(shipment);
 }
 
 /**
 * An Acceleration reading has been received for a shipment
 * @param {org.asset.tracking.solution.AccelerationReading} AccelReading - the AccelReading transaction
 * @transaction
 */
 async function AccelerationReading(txAccelationReading) {
   const factory = getFactory();
   const NS = 'org.asset.tracking.solution';
   const me = getCurrentParticipant();
   const shipment = txAccelationReading.shipment;
   const contract = shipment.contract;
   
   console.log('Adding acceleration ' + txAccelationReading.accelerationX + ' to shipment ' + shipment.shipmentID);
   
   if (shipment.accelerationReadings) {
     shipment.accelerationReadings.push(txAccelationReading);
   } else {
     shipment.accelerationReadings = [txAccelationReading];
   }
   
   //Check the AccelerationX, AccelerationY, AccelerationZ against contract max Acceleration
   if (txAccelationReading.accelerationX < contract.maxAcceleration || txAccelationReading.accelerationY < contract.maxAcceleration || txAccelationReading.accelerationZ < contract.maxAcceleration) {
     
     let AccelerationEvent = factory.newEvent(NS, 'AccelerationThresholdEvent');
     AccelerationEvent.shipment = shipment;
     AccelerationEvent.latitude = txAccelationReading.latitude;
     AccelerationEvent.longitude = txAccelationReading.longitude;
     AccelerationEvent.readingTime = txAccelationReading.readingTime;
     AccelerationEvent.accelerationX = txAccelationReading.accelerationX;
     AccelerationEvent.accelerationY = txAccelationReading.accelerationY;
     AccelerationEvent.accelerationZ = txAccelationReading.accelerationZ;
     
     AccelerationEvent.message = 'Acceleration Threshold Alert ' + shipment.shipmentID;
     
     emit(AccelerationEvent);
   }
   
   const shipmentRegistry = await getAssetRegistry(NS + '.Shipment');
   await shipmentRegistry.update(shipment);
 }
 
 
 /**
 * A GPS reading has been received for a shipment
 * @param {org.asset.tracking.solution.GPSReading} gpsReading - the GpsReading transaction
 * @transaction
 */
 async function GPSReading(txGPSReading) {
   
   const factory = getFactory();
   const NS = 'org.asset.tracking.solution';
   const me = getCurrentParticipant();
   const shipment = txGPSReading.shipment;
   const contract = shipment.contract;
   
   
   if (shipment.gpsReadings) {
     shipment.gpsReadings.push(txGPSReading);
   } else {
     shipment.gpsReadings = [txGPSReading];
   }
   
   const lattlong = txGPSReading.latitude + txGPSReading.latitudeDirection +"<< Lat : Long >>"+ txGPSReading.longitude + txGPSReading.longitudeDirection;
   console.log(lattlong);
   
   let shipmentInPortEvent = factory.newEvent(NS, 'ShipmentInPortEvent');
   shipmentInPortEvent.shipment = shipment;
   let message = 'Shipment has reached the destination port of << Lat : Long >> ' + lattlong;
   shipmentInPortEvent.message = message;
   
   emit(shipmentInPortEvent);
   
   const shipmentRegistry = await getAssetRegistry(NS + '.Shipment');
   await shipmentRegistry.update(shipment);
 }
 
 /**
 * A GPS reading has been received for a shipment
 * @param {org.asset.tracking.solution.ShipmentReceived} gpsReading - the GpsReading transaction
 * @transaction
 */
 async function ShipmentReceived(txShipmentReceived) {
   
   const factory = getFactory();
   const NS = 'org.asset.tracking.solution';
   const me = getCurrentParticipant();
   const shipment = txShipmentReceived.shipment;
   const contract = txShipmentReceived.shipment.contract;
   let payOut = contract.unitPrice * shipment.unitCount;
   
   //alert('Received at: ' + txShipmentReceived.timestamp);
   //alert('Contract arrivalDateTime: ' + contract.arrivalDateTime);
   
   //Update the shipment status to “Arrived”.
   shipment.shipmentStatus = 'Arrived';
   
   // If the shipment is late as per the contract, set the payout to 0.
   if (txShipmentReceived.timestamp > contract.arrivalDateTime) {
     payOut = 0;
     alert("Shipment Arrived Late, so No Payout Required")
   } else {
     
       if (shipment.temperatureReadings) {
           shipment.temperatureReadings.sort(function (a, b) {
           return (a.celsius - b.celsius);
       });
       
       // Penalty for Tempearature
       let lowestReading = shipment.temperatureReadings[0];
       let highestReading = shipment.temperatureReadings[shipment.temperatureReadings.length - 1];
       let penalty = 0;
       
       if (lowestReading.celsius < contract.minTemprature) {
         penalty += (contract.minTemperature - lowestReading.celsius) * contract.minPenaltyFactor;
         alert('Min temp penalty: ' + penalty);
       }
       
       
       // Penalty for  Acceleration // I am not sure  what calculation i should placed here. Its always showing negative values
       let lowestAccelReading = shipment.accelerationReadings[0];
       if(contract.maxAcceleration < (lowestAccelReading.accelerationX + lowestAccelReading.accelerationY + lowestAccelReading.accelerationZ)){
         penalty += (contract.maxAcceleration - (lowestAccelReading.accelerationX + lowestAccelReading.accelerationY + lowestAccelReading.accelerationZ)) * contract.maxPenaltyFactor;
         alert(' Penalty for acceleration: ' + penalty);
       }
       
       //Multiply the penalty with the total number of assets.
       //Subtract the total penalty from the total payout.
       payOut -= (penalty * shipment.unitCount);
       
       if (payOut < 0) {
         payOut = 0;
       }
     }
   }
   
   
   contract.exporter.exporterAcctBalc += payOut;
   contract.importer.importerAcctBalc -= payOut;
   
   //Final payout of the Shipment
   console.log('Payout: ' + payOut);
   console.log('Exporter: ' + contract.exporter.exporterId + ' new balance: ' + contract.exporter.exporterAcctBalc);
   console.log('Importer: ' + contract.importer.importerId + ' new balance: ' + contract.importer.importerAcctBalc);
   
   // Update the Exporter
   const exporterRegistry = await getParticipantRegistry(NS + '.Exporter');
   await exporterRegistry.update(contract.exporter);
   
   // Update the Importers
   const importerRegistry = await getParticipantRegistry(NS + '.Importer');
   await importerRegistry.update(contract.importer);
   
   // Update the Shipment
   const shipmentRegistry = await getAssetRegistry(NS + '.Shipment');
   await shipmentRegistry.update(shipment);
 }
 