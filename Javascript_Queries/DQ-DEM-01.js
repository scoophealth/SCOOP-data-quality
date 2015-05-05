/**
 * Created by rrusk on 2015/02/20.
 * Modified by rrusk on 2015/05/04.
 */
// Title: What percentage of patients, flagged as active, had at least one encounter in the past 24 months?
// Description: DQ-DEM-01
// Note 1: only active records are included in E2E exports
// Note 2: encounters include entries in case management notes and prescription events

function map(patient) {

    var drugList = patient.medications();
    var encounterList = patient.encounters();

    var refdateStr = setStoppDQRefDateStr(); // hQuery library function call
    var refdate = new Date(refdateStr);      // refdateStr is 'yyyy,mm,dd' with mm from 1-12
    refdate.setHours(23, 59);                // set to end of refdate then subtract one day
    var start = addDate(refdate, -2, 0, -1); // 24 month study window; generally most
    var end = addDate(refdate, 0, 0, -1);    // recent records are from previous day
    var currentRec = currentRecord(end);

    // Shifts date by year, month, and date specified
    function addDate(date, y, m, d) {
        var n = new Date(date);
        n.setFullYear(date.getFullYear() + (y || 0));
        n.setMonth(date.getMonth() + (m || 0));
        n.setDate(date.getDate() + (d || 0));
        return n;
    }

    // Test that record is current (as of day before study reference date at 0:00AM)
    function currentRecord(date) {
        var daybefore = new Date(date);
        daybefore.setHours(0, 0);
        return patient['json']['effective_time'] > daybefore / 1000;
    }

    // Checks for encounter between start and end dates
    function hadEncounter(startDate, endDate) {
        for (var i = 0; i < encounterList.length; i++) {
            if (encounterList[i].startDate() >= startDate &&
                encounterList[i].startDate() <= endDate) {
                return true;
            }
        }
        return false;
    }

    // Checks for prescription encounter between start and end dates
    function hadRxEncounter(startDate, endDate) {
        for (var i = 0; i < drugList.length; i++) {
            if (typeof drugList[i].orderInformation() !== 'undefined' &&
                typeof drugList[i].orderInformation().length != 0) {
                for (var j = 0; j < drugList[i].orderInformation().length; j++) {
                    var drugPrescribed = drugList[i].orderInformation()[j].orderDateTime();
                    drugPrescribed.setHours(24,1);  // kludge to get start date to match rx_date in EMR
                    if (drugPrescribed >= startDate && drugPrescribed <= endDate) {
                        return true;
                    }
                }
            }
        }
        return false;
    }


    refdateStr = refdateStr.replace(/,/g, '');
    emit('denominator_' + refdateStr, 0);
    emit('numerator_' + refdateStr, 0);
    if (currentRec) {
        emit('denominator_' + refdateStr, 1);
        if (hadEncounter(start, end) || hadRxEncounter(start, end)) {
            // emit('num_'+patient['json']['emr_demographics_primary_key'], 1);
            emit('numerator_' + refdateStr, 1);
        }
    }
}
