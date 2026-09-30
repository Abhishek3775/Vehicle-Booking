export const VEHICLE_TYPES = [
  { label: '4 Wheeler (Car / SUV)', value: 'FOUR_WHEELER', icon: 'car-outline' },
  { label: '2 Wheeler (Bike / Scooter)', value: 'TWO_WHEELER', icon: 'bicycle-outline' },
];

export const FUEL_TYPES = [
  { label: 'Petrol', value: 'PETROL' },
  { label: 'Diesel', value: 'DIESEL' },
  { label: 'CNG', value: 'CNG' },
  { label: 'Electric (EV)', value: 'ELECTRIC' },
  { label: 'Hybrid', value: 'HYBRID' },
];

export const TRANSMISSION_TYPES = [
  { label: 'Manual', value: 'MANUAL' },
  { label: 'Automatic', value: 'AUTOMATIC' },
  { label: 'AMT', value: 'AMT' },
  { label: 'CVT', value: 'CVT' },
  { label: 'DCT', value: 'DCT' },
];

export const ADDRESS_LABELS = [
  { label: 'Home', value: 'HOME', icon: 'home-outline' },
  { label: 'Work', value: 'WORK', icon: 'briefcase-outline' },
  { label: 'Office', value: 'OFFICE', icon: 'business-outline' },
  { label: 'Other', value: 'OTHER', icon: 'location-outline' },
];

export const SERVICE_CATEGORIES = [
  { label: 'All', value: 'ALL', icon: 'grid-outline' },
  { label: 'Maintenance', value: 'PERIODIC_SERVICE', icon: 'construct-outline' },
  { label: 'General', value: 'GENERAL_SERVICE', icon: 'speedometer-outline' },
  { label: 'Brakes', value: 'BRAKE', icon: 'disc-outline' },
  { label: 'Battery', value: 'BATTERY', icon: 'flash-outline' },
  { label: 'Tyres', value: 'TYRE', icon: 'car-sport-outline' },
  { label: 'AC', value: 'AC', icon: 'snow-outline' },
  { label: 'Electrical', value: 'ELECTRICAL', icon: 'hardware-chip-outline' },
  { label: 'Diagnostics', value: 'DIAGNOSTICS', icon: 'analytics-outline' },
  { label: 'Washing', value: 'WASHING', icon: 'water-outline' },
];

export const EMERGENCY_ISSUES = [
  { id: 'flat_tyre', label: 'Flat Tyre', icon: 'car-sport-outline', desc: 'Punctured or flat tyre replacement' },
  { id: 'battery_issue', label: 'Battery Issue', icon: 'flash-outline', desc: 'Battery dead, jump-start needed' },
  { id: 'engine_problem', label: 'Engine Problem', icon: 'cog-outline', desc: 'Engine stalling, overheating, noise' },
  { id: 'fuel_issue', label: 'Fuel Issue', icon: 'flame-outline', desc: 'Out of fuel or incorrect fuel' },
  { id: 'accident', label: 'Accident Recovery', icon: 'warning-outline', desc: 'Accident assistance & towing' },
  { id: 'vehicle_breakdown', label: 'Vehicle Breakdown', icon: 'construct-outline', desc: 'Sudden stoppage or mechanical fault' },
  { id: 'other', label: 'Other Issue', icon: 'help-circle-outline', desc: 'Other immediate roadside concern' },
];

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  ON_THE_WAY: 'ON_THE_WAY',
  ARRIVED: 'ARRIVED',
  INSPECTION: 'INSPECTION',
  QUOTE_PENDING: 'QUOTE_PENDING',
  QUOTE_APPROVED: 'QUOTE_APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
};

export const BOOKING_STATUS_CONFIG = {
  PENDING: { label: 'Requested', color: '#F59E0B', bg: '#FFFBEB', step: 1 },
  ASSIGNED: { label: 'Mechanic Assigned', color: '#3B82F6', bg: '#EFF6FF', step: 2 },
  ACCEPTED: { label: 'Accepted', color: '#3B82F6', bg: '#EFF6FF', step: 2 },
  ON_THE_WAY: { label: 'On The Way', color: '#0B4F5C', bg: '#EBF5F7', step: 3 },
  ARRIVED: { label: 'Mechanic Arrived', color: '#0B4F5C', bg: '#EBF5F7', step: 4 },
  INSPECTION: { label: 'Vehicle Inspection', color: '#8B5CF6', bg: '#F5F3FF', step: 5 },
  QUOTE_PENDING: { label: 'Quote Ready', color: '#F59E0B', bg: '#FFFBEB', step: 6 },
  QUOTE_APPROVED: { label: 'Quote Approved', color: '#10B981', bg: '#ECFDF5', step: 7 },
  IN_PROGRESS: { label: 'Service In Progress', color: '#3B82F6', bg: '#EFF6FF', step: 7 },
  COMPLETED: { label: 'Service Done', color: '#10B981', bg: '#ECFDF5', step: 8 },
  PAYMENT_PENDING: { label: 'Payment Due', color: '#F59E0B', bg: '#FFFBEB', step: 9 },
  PAID: { label: 'Paid', color: '#10B981', bg: '#ECFDF5', step: 10 },
  CLOSED: { label: 'Completed', color: '#64748B', bg: '#F1F5F9', step: 10 },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: '#FEF2F2', step: -1 },
};

export const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI / Google Pay / PhonePe', icon: 'qr-code-outline' },
  { id: 'CARD', label: 'Credit / Debit Card', icon: 'card-outline' },
  { id: 'NET_BANKING', label: 'Net Banking', icon: 'business-outline' },
  { id: 'WALLET', label: 'Digital Wallets', icon: 'wallet-outline' },
];
