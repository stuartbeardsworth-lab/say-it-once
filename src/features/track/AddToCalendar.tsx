import { Button } from '../../components/Button';
import { today } from '../../domain/dates';
import { appointmentCalendar, safeFileName } from '../../domain/exports';
import type { AppointmentData } from '../../domain/types';
import { deliverFile, deliveryMessage } from '../../forms/deliverFile';
import { useRecordName } from '../../store/hooks';

// "Add to my calendar" hands a calendar file to the phone, whose own calendar
// then gives the reminder (Say It Once can't send alerts). Only for upcoming
// appointments that aren't private: a private one never leaves the app.

export interface CalendarAppointment {
  id: string;
  data: AppointmentData;
  private: boolean;
}

export function canAddToCalendar(appt: CalendarAppointment): boolean {
  return !appt.private && appt.data.date >= today();
}

export function AddToCalendarButton({
  appt,
  onMessage,
}: {
  appt: CalendarAppointment;
  onMessage: (message: string) => void;
}) {
  const recordName = useRecordName() ?? 'My record';

  async function add() {
    const d = appt.data;
    const name = safeFileName(`${d.organisation} ${d.date}`, 'ics');
    const result = await deliverFile(appointmentCalendar(appt.id, d, recordName), name, 'text/calendar');
    onMessage(deliveryMessage(result, name, 'Open it to add the appointment to your calendar.'));
  }

  return <Button onPress={() => void add()}>Add to my calendar</Button>;
}
