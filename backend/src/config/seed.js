const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Auth = require('../modules/auth/auth.model');
const User = require('../modules/user/user.model');
const Admin = require('../modules/admin/admin.model');
const Mechanic = require('../modules/mechanic/mechanic.model');
const Vehicle = require('../modules/vehicle/vehicle.model');
const Service = require('../modules/service/service.model');
const ServicePackage = require('../modules/service-package/servicePackage.model');
const Part = require('../modules/parts/parts.model');
const Booking = require('../modules/booking/booking.model');
const Payment = require('../modules/payment/payment.model');
const Invoice = require('../modules/invoice/invoice.model');

const { ROLES, ACCOUNT_STATUS } = require('../modules/auth/auth.constants');
const { ADMIN_STATUS, ADMIN_PERMISSIONS } = require('../modules/admin/admin.constants');
const { VERIFICATION_STATUS, AVAILABILITY_STATUS, WORK_STATUS, SPECIALIZATIONS } = require('../modules/mechanic/mechanic.constants');
const { SERVICE_CATEGORIES, VEHICLE_TYPES, SERVICE_STATUS } = require('../modules/service/service.constants');
const { PART_CATEGORIES, PART_UNITS, PART_STATUS } = require('../modules/parts/parts.constants');
const { BOOKING_TYPES, BOOKING_STATUS } = require('../modules/booking/booking.constants');
const { PAYMENT_STATUS, PAYMENT_METHODS, CURRENCIES } = require('../modules/payment/payment.constants');
const { INVOICE_STATUS, INVOICE_PAYMENT_STATUS } = require('../modules/invoice/invoice.constants');

/**
 * Seed initial sample database records if collections are empty.
 */
async function seedInitialData() {
  try {
    const authCount = await Auth.countDocuments();
    if (authCount > 0) {
      // Ensure existing Admin account has passwordHash and email configured for password login
      const adminAuth = await Auth.findOne({ role: ROLES.ADMIN }).select('+passwordHash');
      if (adminAuth) {
        let updated = false;
        if (!adminAuth.passwordHash) {
          adminAuth.passwordHash = await bcrypt.hash('Admin@123', 10);
          updated = true;
        }
        if (!adminAuth.email) {
          adminAuth.email = 'admin@vehiclebooking.com';
          updated = true;
        }
        if (updated) {
          await adminAuth.save();
          console.log('[Seed] Admin account credentials updated with email and password (Admin@123).');
        }
      }
      console.log('[Seed] Database ready. Admin credentials configured (admin@vehiclebooking.com / Admin@123).');
      return;
    }

    console.log('[Seed] Database is empty. Seeding initial development datasets...');

    // 1. Create Admin Account
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const adminUserId = new mongoose.Types.ObjectId();
    const adminAuth = await Auth.create({
      userId: adminUserId,
      phone: '+919876543210',
      email: 'admin@vehiclebooking.com',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      isPhoneVerified: true,
      lastLoginAt: new Date(),
    });

    const adminUser = await User.create({
      userId: adminUserId,
      authId: adminAuth._id,
      firstName: 'Lead',
      lastName: 'Administrator',
      email: 'admin@vehiclebooking.com',
    });

    await Admin.create({
      userId: adminUserId,
      adminCode: 'ADM-0001',
      displayName: 'Lead Administrator',
      department: 'Operations & Fleet',
      permissions: Object.values(ADMIN_PERMISSIONS),
      status: ADMIN_STATUS.ACTIVE,
      lastLoginAt: new Date(),
    });

    // 2. Create Customer Account
    const customerUserId = new mongoose.Types.ObjectId();
    const customerAuth = await Auth.create({
      userId: customerUserId,
      phone: '+919876543211',
      email: 'john.doe@example.com',
      role: ROLES.CUSTOMER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      isPhoneVerified: true,
    });

    const customerUser = await User.create({
      userId: customerUserId,
      authId: customerAuth._id,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    });

    // 3. Customer's Vehicle
    const customerVehicle = await Vehicle.create({
      userId: customerUserId,
      vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
      make: 'Honda',
      model: 'City',
      variant: 'ZX Petrol',
      registrationNumber: 'DL-01-AB-1234',
      registrationYear: 2022,
      fuelType: 'PETROL',
      transmissionType: 'AUTOMATIC',
    });

    // 4. Create Verified Mechanic
    const mechanicUserId = new mongoose.Types.ObjectId();
    const mechanicAuth = await Auth.create({
      userId: mechanicUserId,
      phone: '+919876543212',
      email: 'ramesh.mechanic@example.com',
      role: ROLES.MECHANIC,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      isPhoneVerified: true,
    });

    await User.create({
      userId: mechanicUserId,
      authId: mechanicAuth._id,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      email: 'ramesh.mechanic@example.com',
    });

    const mechanic = await Mechanic.create({
      userId: mechanicUserId,
      mechanicCode: 'MECH-001',
      displayName: 'Ramesh Kumar (Master Tech)',
      phone: '+919876543212',
      experienceYears: 7,
      specialization: SPECIALIZATIONS.GENERAL_SERVICE,
      skills: ['Engine Diagnostics', 'Brake Systems', 'Electrical', 'AC Service'],
      supportedVehicleTypes: [VEHICLE_TYPES.TWO_WHEELER, VEHICLE_TYPES.FOUR_WHEELER],
      availabilityStatus: AVAILABILITY_STATUS.ONLINE,
      workStatus: WORK_STATUS.IDLE,
      verificationStatus: VERIFICATION_STATUS.VERIFIED,
      verificationNotes: 'Verified background checks, trade certification and driving license.',
      rating: { average: 4.85, count: 42 },
      currentLocation: {
        latitude: 28.6139,
        longitude: 77.2090,
        addressText: 'Connaught Place, New Delhi',
        lastUpdatedAt: new Date(),
      },
    });

    // 5. Seed Core Services
    const service1 = await Service.create({
      name: 'Comprehensive Periodic General Service',
      slug: 'comprehensive-periodic-service',
      description: 'Comprehensive 40-point vehicle checkup including engine oil replacement, oil filter change, brake clean, coolant top-up, and air filter inspection.',
      shortDescription: '40-point bumper to bumper periodic maintenance',
      category: SERVICE_CATEGORIES.PERIODIC_SERVICE,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      estimatedDuration: 90,
      basePrice: 2499,
      status: SERVICE_STATUS.ACTIVE,
      displayOrder: 1,
    });

    const service2 = await Service.create({
      name: 'Full Synthetic Engine Oil & Filter Change',
      slug: 'synthetic-oil-filter-change',
      description: 'Flush and refill with Mobil 1 5W-30 premium full synthetic oil and brand new OEM spin-on oil filter.',
      shortDescription: 'Mobil 1 5W-30 + OEM filter replacement',
      category: SERVICE_CATEGORIES.ENGINE,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER, VEHICLE_TYPES.TWO_WHEELER],
      estimatedDuration: 45,
      basePrice: 1499,
      status: SERVICE_STATUS.ACTIVE,
      displayOrder: 2,
    });

    const service3 = await Service.create({
      name: 'Front Ceramic Brake Pad Replacement',
      slug: 'ceramic-brake-pad-replacement',
      description: 'Precision replacement of front disc brake pads using Brembo ceramic pads, rotor disc degreasing, and brake fluid top-up.',
      shortDescription: 'Brembo ceramic front brake pad replacement',
      category: SERVICE_CATEGORIES.BRAKE,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      estimatedDuration: 60,
      basePrice: 1899,
      status: SERVICE_STATUS.ACTIVE,
      displayOrder: 3,
    });

    const service4 = await Service.create({
      name: 'Emergency Roadside Battery Jumpstart',
      slug: 'emergency-roadside-jumpstart',
      description: 'Rapid on-demand battery boost, alternator voltage charging inspection, and electrical terminal health check.',
      shortDescription: 'Rapid jumpstart & electrical system test',
      category: SERVICE_CATEGORIES.ROADSIDE_ASSISTANCE,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER, VEHICLE_TYPES.TWO_WHEELER],
      estimatedDuration: 30,
      basePrice: 499,
      isEmergency: true,
      status: SERVICE_STATUS.ACTIVE,
      displayOrder: 4,
    });

    const service5 = await Service.create({
      name: 'AC Cooling Coil Deep Clean & Gas Top-up',
      slug: 'ac-deep-clean-refrigerant',
      description: 'Ultrasonic evaporator cleaning, cabin filter disinfection, blower fan lubrication, and R134a refrigerant gas top-up.',
      shortDescription: 'AC disinfection and R134a gas recharge',
      category: SERVICE_CATEGORIES.AC,
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      estimatedDuration: 60,
      basePrice: 1299,
      status: SERVICE_STATUS.ACTIVE,
      displayOrder: 5,
    });

    // 6. Seed Service Packages
    await ServicePackage.create({
      name: 'Gold Annual Maintenance Shield',
      slug: 'gold-annual-shield',
      description: 'Complete peace of mind: covers 2 comprehensive periodic services, 1 brake overhaul, and free roadside assistance for 1 year.',
      shortDescription: 'Annual all-inclusive vehicle coverage',
      services: [service1._id, service2._id, service3._id],
      basePrice: 4499,
      estimatedDuration: 120,
      status: 'ACTIVE',
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      benefits: ['2 Comprehensive Services', 'Free Roadside Jumpstart', 'Brake Pad Cleaning', '15% Off Parts'],
    });

    await ServicePackage.create({
      name: 'Essential Monsoon Safety Pack',
      slug: 'essential-monsoon-pack',
      description: 'Prepare your vehicle for rainy conditions with full wiper blade inspection, brake pad service, and electrical moisture insulation.',
      shortDescription: 'Monsoon braking and electrical readiness pack',
      services: [service3._id, service4._id],
      basePrice: 1999,
      estimatedDuration: 75,
      status: 'ACTIVE',
      vehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
      benefits: ['Ceramic Brake Inspection', 'Wiper Blade Replacement', 'Battery Moisture Seal'],
    });

    // 7. Seed Parts / Inventory
    await Part.create({
      name: 'Mobil 1 5W-30 Full Synthetic Motor Oil (4L)',
      sku: 'OIL-MOB-5W30-4L',
      partNumber: 'MOB-5W30-SYN',
      description: 'Advanced full synthetic engine oil designed for high thermal stability and ultimate wear protection.',
      category: PART_CATEGORIES.FLUID,
      brand: 'Mobil 1',
      unit: PART_UNITS.LITRE,
      sellingPrice: 2400,
      costPrice: 1750,
      stockQuantity: 50,
      reservedQuantity: 2,
      minStockThreshold: 10,
      status: PART_STATUS.ACTIVE,
      compatibleVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
    });

    await Part.create({
      name: 'Brembo Ceramic Front Brake Pads (Set of 4)',
      sku: 'BRK-BREM-CER-01',
      partNumber: 'P06038N',
      description: 'OE equivalent premium ceramic friction brake pads with built-in acoustic wear indicators.',
      category: PART_CATEGORIES.BRAKE,
      brand: 'Brembo',
      unit: PART_UNITS.SET,
      sellingPrice: 1850,
      costPrice: 1200,
      stockQuantity: 25,
      reservedQuantity: 1,
      minStockThreshold: 5,
      status: PART_STATUS.ACTIVE,
      compatibleVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
    });

    await Part.create({
      name: 'Bosch High-Efficiency Activated Carbon Cabin Air Filter',
      sku: 'FLT-BOS-CAB01',
      partNumber: '1987432300',
      description: 'Multi-layer particulate filter with active charcoal layer to trap pollen, fine dust, and exhaust odors.',
      category: PART_CATEGORIES.FILTER,
      brand: 'Bosch',
      unit: PART_UNITS.PIECE,
      sellingPrice: 550,
      costPrice: 320,
      stockQuantity: 40,
      reservedQuantity: 0,
      minStockThreshold: 8,
      status: PART_STATUS.ACTIVE,
      compatibleVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
    });

    await Part.create({
      name: 'Exide Matrix 12V 45Ah Maintenance-Free Automotive Battery',
      sku: 'BAT-EXI-MAT45',
      partNumber: 'MTRED45L',
      description: 'High cranking amperage starting battery with puncture-resistant glass mat separators and 5-year warranty.',
      category: PART_CATEGORIES.BATTERY,
      brand: 'Exide',
      unit: PART_UNITS.PIECE,
      sellingPrice: 4800,
      costPrice: 3800,
      stockQuantity: 15,
      reservedQuantity: 1,
      minStockThreshold: 4,
      status: PART_STATUS.ACTIVE,
      compatibleVehicleTypes: [VEHICLE_TYPES.FOUR_WHEELER],
    });

    // 8. Seed Bookings
    const booking1 = await Booking.create({
      bookingReference: 'BK-2026-0001',
      userId: customerUserId,
      vehicleId: customerVehicle._id,
      serviceId: service1._id,
      bookingType: BOOKING_TYPES.SCHEDULED,
      scheduledAt: new Date(Date.now() + 3600000 * 2), // 2 hours from now
      status: BOOKING_STATUS.IN_PROGRESS,
      customerNotes: 'Please check slight squeaking sound when braking.',
      locationSnapshot: {
        latitude: 28.6139,
        longitude: 77.2090,
        addressText: 'A-14, Connaught Place, New Delhi',
      },
      addressSnapshot: {
        fullName: 'John Doe',
        phone: '+919876543211',
        addressLine1: 'A-14, Inner Circle',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110001',
      },
      vehicleSnapshot: {
        vehicleId: customerVehicle._id,
        make: 'Honda',
        model: 'City',
        variant: 'ZX Petrol',
        registrationNumber: 'DL-01-AB-1234',
        vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
        fuelType: 'PETROL',
      },
      serviceSnapshot: {
        serviceId: service1._id,
        name: service1.name,
        category: service1.category,
        basePrice: service1.basePrice,
        estimatedDuration: service1.estimatedDuration,
      },
    });

    const booking2 = await Booking.create({
      bookingReference: 'BK-2026-0002',
      userId: customerUserId,
      vehicleId: customerVehicle._id,
      serviceId: service2._id,
      bookingType: BOOKING_TYPES.SCHEDULED,
      scheduledAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
      status: BOOKING_STATUS.COMPLETED,
      customerNotes: 'Regular 10,000 km oil service.',
      locationSnapshot: {
        latitude: 28.6139,
        longitude: 77.2090,
        addressText: 'A-14, Connaught Place, New Delhi',
      },
      addressSnapshot: {
        fullName: 'John Doe',
        phone: '+919876543211',
        addressLine1: 'A-14, Inner Circle',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110001',
      },
      vehicleSnapshot: {
        vehicleId: customerVehicle._id,
        make: 'Honda',
        model: 'City',
        variant: 'ZX Petrol',
        registrationNumber: 'DL-01-AB-1234',
        vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
        fuelType: 'PETROL',
      },
      serviceSnapshot: {
        serviceId: service2._id,
        name: service2.name,
        category: service2.category,
        basePrice: service2.basePrice,
        estimatedDuration: service2.estimatedDuration,
      },
    });

    const booking3 = await Booking.create({
      bookingReference: 'BK-2026-0003',
      userId: customerUserId,
      vehicleId: customerVehicle._id,
      serviceId: service4._id,
      bookingType: BOOKING_TYPES.EMERGENCY,
      scheduledAt: new Date(Date.now() + 86400000),
      status: BOOKING_STATUS.PENDING,
      customerNotes: 'Battery completely dead near metro station.',
      locationSnapshot: {
        latitude: 28.6200,
        longitude: 77.2150,
        addressText: 'Barakhamba Road, New Delhi',
      },
      addressSnapshot: {
        fullName: 'John Doe',
        phone: '+919876543211',
        addressLine1: 'Barakhamba Road',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        postalCode: '110001',
      },
      vehicleSnapshot: {
        vehicleId: customerVehicle._id,
        make: 'Honda',
        model: 'City',
        variant: 'ZX Petrol',
        registrationNumber: 'DL-01-AB-1234',
        vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
        fuelType: 'PETROL',
      },
      serviceSnapshot: {
        serviceId: service4._id,
        name: service4.name,
        category: service4.category,
        basePrice: service4.basePrice,
        estimatedDuration: service4.estimatedDuration,
      },
    });

    // 9. Payment for Completed Booking 2
    const dummyQuotationId = new mongoose.Types.ObjectId();
    const payment = await Payment.create({
      paymentReference: 'PAY-20260924-0001',
      quotationId: dummyQuotationId,
      bookingId: booking2._id,
      userId: customerUserId,
      amount: 1499,
      currency: CURRENCIES.INR,
      paymentMethod: PAYMENT_METHODS.RAZORPAY,
      gateway: 'RAZORPAY',
      gatewayOrderId: 'order_dummy_123456',
      gatewayPaymentId: 'pay_dummy_654321',
      status: PAYMENT_STATUS.SUCCESS,
      paidAt: new Date(Date.now() - 86400000 * 2),
    });

    // 10. Invoice for Completed Booking 2
    await Invoice.create({
      invoiceNumber: 'INV-202609-0001',
      invoiceReference: 'REF-INV-202609-0001',
      bookingId: booking2._id,
      quotationId: dummyQuotationId,
      paymentId: payment._id,
      userId: customerUserId,
      vehicleId: customerVehicle._id,
      customerSnapshot: {
        userId: customerUserId,
        name: 'John Doe',
        phone: '+919876543211',
        email: 'john.doe@example.com',
      },
      vehicleSnapshot: {
        vehicleId: customerVehicle._id,
        make: 'Honda',
        model: 'City',
        variant: 'ZX Petrol',
        registrationNumber: 'DL-01-AB-1234',
        vehicleType: VEHICLE_TYPES.FOUR_WHEELER,
      },
      paymentSnapshot: {
        paymentId: payment._id,
        paymentReference: payment.paymentReference,
        paymentMethod: payment.paymentMethod,
        amountPaid: 1499,
        paidAt: new Date(Date.now() - 86400000 * 2),
      },
      items: [
        {
          itemType: 'SERVICE',
          serviceId: service2._id,
          name: service2.name,
          quantity: 1,
          unitPrice: 1499,
          total: 1499,
        },
      ],
      subtotal: 1499,
      totalAmount: 1499,
      amountPaid: 1499,
      amountDue: 0,
      currency: CURRENCIES.INR,
      status: INVOICE_STATUS.PAID,
      paymentStatus: INVOICE_PAYMENT_STATUS.PAID,
      paidAt: new Date(Date.now() - 86400000 * 2),
      issuedAt: new Date(Date.now() - 86400000 * 2),
    });

    console.log(`\n======================================================`);
    console.log(`✅ [Seed] Database successfully populated with initial datasets!`);
    console.log(`🔑 Admin Login Email:    admin@vehiclebooking.com`);
    console.log(`🔑 Admin Login Password: Admin@123`);
    console.log(`👤 Customer Phone:       +919876543211`);
    console.log(`🔧 Mechanic Phone:       +919876543212`);
    console.log(`======================================================\n`);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`, error);
  }
}

module.exports = seedInitialData;
